// server/middleware/authMiddleware.js
import asyncHandler from "express-async-handler";
import AppError from "../utils/appError.js";
import { logger } from "./logger.js";
import { verify2FAToken, verifyJWT } from "../utils/generateToken.js";
import { findUserById } from "../models/User.js";
import { getUserRepository } from "../config/db.js";

/* =======================================================================================
   OPTIONAL AUTH – Session bootstrap (GET /users/me, etc.)
   ======================================================================================= */
/**
 * Optional JWT: sets req.user when a valid Bearer token is present; otherwise leaves req.user unset.
 * Use for routes like GET /users/me that must work for anonymous clients without 401 noise.
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    req.user = undefined;
    return next();
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    req.user = undefined;
    return next();
  }

  let decoded;
  try {
    decoded = verifyJWT(token);
  } catch {
    return next(new AppError("Invalid or expired token.", 401));
  }

  const users = getUserRepository();
  const currentUser = await findUserById(decoded.userId, {}, users);

  if (!currentUser) {
    req.user = undefined;
    return next();
  }

  if (currentUser.active === false) {
    return next(new AppError("Account disabled. Contact support.", 403));
  }

  if (
    currentUser.passwordChangedAt &&
    decoded.issuedAtMs < new Date(currentUser.passwordChangedAt).getTime()
  ) {
    return next(new AppError("Password recently changed. Login again.", 401));
  }

  req.user = currentUser;  res.locals.user = currentUser;
  next();
});

/* =======================================================================================
   PROTECT – Authenticates user using JWT (required)
   ======================================================================================= */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    logger.debug("Protected route: no bearer token", {
      route: req.originalUrl,
      method: req.method,
    });
    return next(new AppError("Not logged in.", 401));
  }

  // Verify JWT
  let decoded;
  try {
    decoded = verifyJWT(token);
  } catch (err) {
    logger.error(`JWT verification failed: ${err.message}`);
    return next(new AppError("Invalid or expired token.", 401));
  }

  // Get user from MongoDB using User model (returns camelCase)
  const currentUser = await findUserById(decoded.userId, {}, getUserRepository());

  if (!currentUser) {
    logger.warn("Token used for non-existing user", { userId: decoded.userId });
    return next(new AppError("User no longer exists.", 401));
  }

  if (currentUser.active === false) {
    logger.warn("Inactive user attempted access");
    return next(new AppError("Account disabled. Contact support.", 403));
  }

  // If password changed after token was issued
  if (
    currentUser.passwordChangedAt &&
    decoded.issuedAtMs < new Date(currentUser.passwordChangedAt).getTime()
  ) {
    return next(new AppError("Password recently changed. Login again.", 401));
  }

  req.user = currentUser;  res.locals.user = currentUser;

  next();
});

/* =======================================================================================
   RESTRICT-TO – Authorize based on role
   ======================================================================================= */
export const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn("Unauthorized role access");
      return next(new AppError("You do not have permission.", 403));
    }

    next();
  };
};

/* =======================================================================================
   VERIFIED EMAIL
   ======================================================================================= */
export const verifiedEmail = asyncHandler(async (req, res, next) => {
  if (!req.user?.isEmailVerified) {
    return next(new AppError("Please verify your email first.", 403));
  }
  next();
});

/* =======================================================================================
   TWO-FACTOR AUTH (uses MongoDB user data)
   ======================================================================================= */
export const twoFactorAuth = asyncHandler(async (req, res, next) => {
  if (!req.user?.twoFactorEnabled) {
    return next();
  }

  if (!req.user.twoFactorSecret) {
    return next(new AppError("Two-factor authentication is unavailable. Contact support.", 403));
  }

  const twoFactorToken = req.headers["x-2fa-token"] || req.body?.twoFactorToken || req.body?.token;

  if (!twoFactorToken) {
    return next(new AppError("2FA token required.", 401));
  }

  const verified = verify2FAToken(req.user.twoFactorSecret, twoFactorToken);

  if (!verified) return next(new AppError("Invalid 2FA token.", 401));

  next();
});
