// server/config/rateLimit.js

import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { createHash } from 'node:crypto';
import { logger } from "../middleware/logger.js";
import AppError from "../utils/appError.js";

dotenv.config();

let redisClient = null;
let RedisStore = null;
const withStoreDeadline = operation => new Promise((resolve, reject) => {
  const timer = setTimeout(() => {
    // Redis command abort options stop queued commands, but the installed client
    // removes them once bytes are written. Close a blackholed connection so
    // in-flight commands cannot leave HTTP requests or startup waiting forever.
    try { redisClient?.destroy(); } catch {}
    reject(new Error("Shared rate-limit store deadline exceeded"));
  }, 5000);
  Promise.resolve().then(operation).then(resolve, reject).finally(() => clearTimeout(timer));
});
if (process.env.REDIS_URL) {
  const [redis, store] = await Promise.all([import("redis"), import("rate-limit-redis")]);
  RedisStore = store.RedisStore;
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL,
      disableOfflineQueue: true,
      socket: { connectTimeout: 5000, reconnectStrategy: false },
    });
  } catch {
    throw new Error("REDIS_URL must be a valid redis:// or rediss:// connection URL. Omit REDIS_URL for single-process local development.");
  }
  redisClient.on("error", () => logger.error("Rate-limit Redis connection error"));
  // Fail startup rather than silently weakening limits on a configured shared store.
  try { await withStoreDeadline(() => redisClient.connect()); }
  catch { throw new Error("Configured shared rate-limit store could not connect"); }
} else if (process.env.NODE_ENV === "production") {
  logger.warn("Rate limits use process memory. Configure REDIS_URL before running multiple API processes or replicas.");
}

const limiterStore = tag => {
  if (!redisClient) return undefined;
  const store = new RedisStore({
    sendCommand: (...args) => withStoreDeadline(() => redisClient.sendCommand(args)),
    prefix: `customforge:rate:${tag}:`,
  });
  const increment = store.increment.bind(store);
  store.increment = async key => {
    try { return await increment(key); }
    catch { throw new AppError("Request limits are temporarily unavailable. Please retry shortly.", 503); }
  };
  return store;
};

export const closeRateLimitStore = async () => {
  if (redisClient?.isOpen) await withStoreDeadline(() => redisClient.quit());
};

/* ----------------------------- Helper Functions ----------------------------- */

// Safely parse environment variables with fallback
const parseEnvInt = (key, fallback) => {
  const val = Number(process.env[key]);
  return Number.isSafeInteger(val) && val > 0 ? val : fallback;
};

// Production limits cannot be disabled by a development flag.
export const skipRateLimit = () => {
  if (!["development", "test"].includes(process.env.NODE_ENV)) return false;
  if (process.env.RATE_LIMIT_ENABLED === "false") return true;
  if (process.env.NODE_ENV === "test") return process.env.RATE_LIMIT_IN_TEST !== "true";
  return process.env.RATE_LIMIT_IN_DEV !== "true";
};

/* ------------------------------- Base Settings ------------------------------ */

// Generic API limiter settings
const WINDOW_MS_API = parseEnvInt("RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000);
const MAX_API_REQ = parseEnvInt("RATE_LIMIT_MAX", 300);

// Specialized limiters (override via .env if needed)
const WINDOW_MS_AUTH = parseEnvInt("RATE_AUTH_WINDOW_MS", WINDOW_MS_API);
const MAX_AUTH_ATTEMPTS = parseEnvInt("RATE_AUTH_MAX", 20);

const WINDOW_MS_PAYMENT = parseEnvInt("RATE_PAYMENT_WINDOW_MS", WINDOW_MS_API);
const MAX_PAYMENT_ATTEMPTS = parseEnvInt("RATE_PAYMENT_MAX", 10);

const WINDOW_MS_ADMIN = parseEnvInt("RATE_ADMIN_WINDOW_MS", WINDOW_MS_API);
const MAX_ADMIN_REQ = parseEnvInt("RATE_ADMIN_MAX", 500);

const WINDOW_MS_PUBLIC = parseEnvInt("RATE_PUBLIC_WINDOW_MS", WINDOW_MS_API);
const MAX_PUBLIC_REQ = parseEnvInt("RATE_PUBLIC_MAX", 300);

const WINDOW_MS_LOG = parseEnvInt("RATE_LOG_WINDOW_MS", 15 * 60 * 1000);
const MAX_LOG_REQ = parseEnvInt("RATE_LOG_MAX", 100);

/* ---------------------------- Limiter Constructor --------------------------- */

// Generic builder with logging + Retry-After header
const buildLimiter = ({ windowMs, max, message, tag, keyGenerator }) =>
  rateLimit({
    store: limiterStore(tag),
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator:
      keyGenerator ||
      ((req) => {
        const userId = req.user?.id;
        return userId ? `user:${userId}` : `ip:${req.ip}`;
      }),
    skip: skipRateLimit,
    handler: (req, res, _next, options) => {
      const retryAfterSec = Math.ceil(windowMs / 1000);

      logger.warn(`[RATE:${tag}] Rate limit exceeded`, {
        ip: req.ip,
        path: req.originalUrl,
        limit: max,
        windowMs,
        retryAfterSec,
        method: req.method,
        requestId: req.requestId,
      });

      res.set("Retry-After", retryAfterSec);
      res.status(options.statusCode).json({
        status: "fail",
        message: options.message,
        retryAfter: retryAfterSec,
      });
    },
  });

/* -------------------------------- Limiters --------------------------------- */

export const apiLimiter = buildLimiter({
  windowMs: WINDOW_MS_API,
  max: MAX_API_REQ,
  message: "Too many requests; please try again later.",
  tag: "API",
});

// This layer remains before body parsing/authentication. It is separate from
// account buckets so changing IP cannot reset an authenticated user's budget.
export const apiIpLimiter = buildLimiter({
  windowMs: WINDOW_MS_API,
  max: parseEnvInt("RATE_IP_MAX", Math.max(MAX_API_REQ, MAX_ADMIN_REQ)),
  message: "Too many requests from this address; please try again later.",
  tag: "API_IP",
  keyGenerator: req => `ip:${req.ip}`,
});

export const authLimiter = buildLimiter({
  windowMs: WINDOW_MS_AUTH,
  max: MAX_AUTH_ATTEMPTS,
  message: "Too many authentication attempts; try again later.",
  tag: "AUTH",
});

export const loginLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: parseEnvInt("RATE_LOGIN_MAX", 20),
  message: "Too many login attempts, please try again later",
  tag: "LOGIN",
});

// Limit recovery for the destination account even across different IPs.
// Mounted after schema validation; neither credentials nor raw email are stored.
export const verificationAccountLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: 'Too many verification requests. Please wait 15 minutes before trying again.',
  tag: 'VERIFY_ACCOUNT',
  keyGenerator: req => createHash('sha256').update(req.body.email).digest('hex'),
});

export const paymentLimiter = buildLimiter({
  windowMs: WINDOW_MS_PAYMENT,
  max: MAX_PAYMENT_ATTEMPTS,
  message: "Too many payment attempts; please wait.",
  tag: "PAYMENT",
});

export const adminLimiter = buildLimiter({
  windowMs: WINDOW_MS_ADMIN,
  max: MAX_ADMIN_REQ,
  message: "Too many admin requests; please try again later.",
  tag: "ADMIN",
});

export const publicLimiter = buildLimiter({
  windowMs: WINDOW_MS_PUBLIC,
  max: MAX_PUBLIC_REQ,
  message: "Too many requests; please try again later.",
  tag: "PUBLIC",
});

export const logRateLimiter = buildLimiter({
  windowMs: WINDOW_MS_LOG,
  max: MAX_LOG_REQ,
  message: "Too many log requests from this IP, please try again later.",
  tag: "LOG",
});

export const userActionLimiter = buildLimiter({
  windowMs: parseEnvInt("RATE_USER_ACTION_WINDOW_MS", WINDOW_MS_API),
  max: parseEnvInt("RATE_USER_ACTION_MAX", 120),
  message: "Too many actions for this account; please slow down.",
  tag: "USER_ACTION",
});

/** Stripe webhooks — isolated from paymentLimiter (signature-verified, retry-heavy). */
export const webhookLimiter = buildLimiter({
  windowMs: parseEnvInt("RATE_WEBHOOK_WINDOW_MS", 60 * 1000),
  max: parseEnvInt("RATE_WEBHOOK_MAX", 120),
  message: "Too many webhook requests; please retry later.",
  tag: "WEBHOOK",
  keyGenerator: (req) => `ip:${req.ip}`,
});

/** Register / forgot / reset / resend-verify — tighter than generic auth limiter. */
export const sensitiveAuthLimiter = rateLimit({
  store: limiterStore("SENSITIVE_AUTH"),
  windowMs: parseEnvInt("RATE_SENSITIVE_AUTH_WINDOW_MS", 15 * 60 * 1000),
  max: parseEnvInt("RATE_SENSITIVE_AUTH_MAX", 10),
  message: "Too many account requests; please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
  handler: (req, res, _next, options) => {
    const retryAfterSec = Math.ceil(
      parseEnvInt("RATE_SENSITIVE_AUTH_WINDOW_MS", 15 * 60 * 1000) / 1000
    );
    logger.warn("[RATE:SENSITIVE_AUTH] Rate limit exceeded", {
      ip: req.ip,
      path: req.originalUrl,
      requestId: req.requestId,
    });
    res.set("Retry-After", retryAfterSec);
    res.status(options.statusCode).json({
      status: "fail",
      message: options.message,
      retryAfter: retryAfterSec,
    });
  },
});
