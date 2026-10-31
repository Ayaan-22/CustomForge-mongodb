// server/controllers/authController.js
import asyncHandler from "express-async-handler";
import crypto from "crypto";

import {
  verifyJWT,
  generateTokenPair,
  hashToken,
  assignEmailVerificationToUser,
  assignPasswordResetToUser,
  generate2FASecret,
  verify2FAToken,
  verifyEmailToken,
  verifyPasswordResetToken,
} from "../utils/generateToken.js";

import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
  rotateRefreshSession,
  revokeRefreshSession,
  comparePassword,
  consumeAuthToken,
} from "../models/User.js";

import Email from "../utils/email.js";
import AppError from "../utils/appError.js";
import { logger } from "../middleware/logger.js";
import { buildCsrfToken } from "../utils/csrf.js";
import { getUserRepository } from "../config/db.js";
import { loginLimiter } from "../config/rateLimit.js";
import { publicUser } from "../utils/publicUser.js";
import { authActionUrl } from "../utils/authActionUrl.js";

/* ===========================================================
   RATE LIMITING
=========================================================== */
export { loginLimiter };

/* ===========================================================
   COOKIE OPTIONS
=========================================================== */
const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
};

/* ===========================================================
   HELPERS
=========================================================== */
const validatePasswordConfirm = (password, passwordConfirm) => {
  if (!password || !passwordConfirm) {
    throw new AppError("Password and passwordConfirm are required", 400);
  }
  if (password !== passwordConfirm) {
    throw new AppError("Passwords do not match", 400);
  }
};

const createSendToken = async (user, statusCode, res, client, expectedHash) => {
  const { accessToken, refreshToken, refreshExpiresAt } = generateTokenPair(user.id, user.role);
  const refreshTokenHash = hashToken(refreshToken);
  const cookieDays = Number(process.env.JWT_REFRESH_COOKIE_EXPIRES_IN || 30);
  if (!Number.isFinite(cookieDays) || cookieDays <= 0) throw new Error("Invalid refresh cookie lifetime");
  const expires = new Date(Math.min(refreshExpiresAt.getTime(), Date.now() + cookieDays * 24 * 60 * 60 * 1000));
  const refreshTokenExpires = expires.toISOString();
  if (expectedHash !== undefined) {
    const rotated = await rotateRefreshSession(user.id, expectedHash, refreshTokenHash, refreshTokenExpires, client, user.passwordChangedAt);
    if (!rotated) throw new AppError("Refresh session changed. Please sign in again.", 401, null, true, "REFRESH_SESSION_CHANGED");
  } else {
    await updateUser(user.id, { refreshTokenHash, refreshTokenExpires }, client);
  }

  res.cookie("refresh_token", refreshToken, { ...refreshCookieOptions, expires });
  res.cookie("csrf_token", buildCsrfToken(`refresh:${refreshToken}`), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  const safeUser = publicUser(user);

  res.status(statusCode).json({
    success: true,
    status: "success",
    token: accessToken,
    accessToken,
    data: { user: safeUser },
  });

  logger.info("Auth token issued", {
    userId: user.id,
    role: user.role,
  });
};

/* ===========================================================
   SIGNUP
   @desc   REGISTER NEW USER
   @route  POST /api/auth/signup
   @access Public
=========================================================== */
export const signup = asyncHandler(async (req, res, next) => {
  const users = getUserRepository();
  logger.info("Signup start", { email: req.body?.email });

  const { name, email, password, passwordConfirm } = req.body;
  validatePasswordConfirm(password, passwordConfirm);

  // Create user in MongoDB
  const newUser = await createUser({
    name,
    email,
    password,
    isEmailVerified: false,
  }, users);

  // Assign token & store hashed token in DB
  const verificationToken = await assignEmailVerificationToUser(newUser.id, users);

  try {
    const verificationUrl = authActionUrl("verify-email", verificationToken);

    await new Email(newUser, verificationUrl).sendWelcome({ verifyEmail: true });

    res.status(201).json({
      status: "success",
      message:
        "User registered successfully. Please check your email to verify your account.",
      data: { user: publicUser(newUser) },
    });

    logger.info("Signup success (verification email sent)", {
      userId: newUser.id,
    });
  } catch (err) {
    // Reset token fields if email fails
    await updateUser(newUser.id, {
      emailVerificationToken: null,
      emailVerificationExpires: null,
    }, users);

    logger.error("Email send failure at signup", {
      error: err.message,
      userId: newUser.id,
    });

    return next(new AppError("Error sending email", 500));
  }
});

/* ===========================================================
   VERIFY EMAIL
   @desc   VERIFY USER EMAIL
   @route  POST /api/auth/verify-email/:token
   @access Public
=========================================================== */
export const verifyEmail = asyncHandler(async (req, res, next) => {
  const users = getUserRepository();
  logger.info("Verify email start");

  const user = await verifyEmailToken(req.params.token, users);
  if (user.active === false) return next(new AppError("Account disabled. Contact support.", 403));

  const verifiedUser = await consumeAuthToken(user.id, 'emailVerificationToken', hashToken(req.params.token), 'emailVerificationExpires', {
    isEmailVerified: true,
    emailVerificationToken: null,
    emailVerificationExpires: null,
  }, users);

  if (!verifiedUser) return next(new AppError('Token is invalid or has expired', 400));

  await createSendToken(verifiedUser, 200, res, users);

  logger.info("Email verified", { userId: user.id });
});

/* ===========================================================
   LOGIN
   @desc   LOGIN USER
   @route  POST /api/auth/login
   @access Public
=========================================================== */
export const login = asyncHandler(async (req, res, next) => {
  const users = getUserRepository();
  logger.info("Login attempt", { email: req.body?.email });

  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  const user = await findUserByEmail(email, { includePassword: true }, users);

  if (!user || !(await comparePassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  if (user.active === false) return next(new AppError("Account disabled. Contact support.", 403));

  if (!user.isEmailVerified) {
    return next(new AppError("Please verify your email first", 401));
  }

  // 2FA check
  if (user.twoFactorEnabled) {
    const twoFactorToken =
      req.body.twoFactorToken || req.headers["x-2fa-token"];

    if (!twoFactorToken) {
      return next(
        new AppError(
          "Two-factor authentication token is required for this account",
          401
        )
      );
    }

    const verified = verify2FAToken(user.twoFactorSecret, twoFactorToken);
    if (!verified) {
      return next(new AppError("Invalid two-factor authentication token", 401));
    }
  }

  await createSendToken(user, 200, res, users);

  logger.info("Login success", { userId: user.id });
});

/* ===========================================================
   LOGOUT
   @desc   LOGOUT USER
   @route  POST /api/auth/logout
   @access Public (refresh cookie authenticates revocation)
=========================================================== */
export const logout = asyncHandler(async (req, res, next) => {
  const refreshToken = req.cookies?.refresh_token;
  let decoded;
  if (refreshToken) {
    try {
      decoded = verifyJWT(refreshToken, "refresh");
    } catch {
      // An invalid/expired cookie has no live session to revoke.
    }
  }
  if (decoded) {
    try {
      const revoked = await revokeRefreshSession(decoded.userId, hashToken(refreshToken), getUserRepository());
      if (!revoked) {
        // Do not clear a cookie belonging to a login/refresh that won the race.
        // The caller must settle concurrent session work before retrying logout.
        return next(new AppError("Your session changed while signing out. Please try again.", 409, null, true, "LOGOUT_SESSION_CHANGED"));
      }
    } catch (error) {
      logger.error("Logout: refresh-token invalidation failed", { userId: decoded.userId, error: error.message });
      return next(new AppError("Unable to revoke your session. Please try signing out again.", 503, null, true, "LOGOUT_REVOKE_FAILED"));
    }
  }

  res.clearCookie("refresh_token", refreshCookieOptions);
  res.clearCookie("csrf_token", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  // Peers compare this server timestamp with access-token issuance time so a
  // delayed logout notification cannot clear a later login.
  res.status(200).json({ status: "success", endedAtMs: Date.now() });

  logger.info("Logout", { userId: decoded?.userId });
});

/* ===========================================================
   FORGOT PASSWORD
   @desc   INITIATE PASSWORD RESET
   @route  POST /api/auth/forgot-password
   @access Public
=========================================================== */
export const forgotPassword = asyncHandler(async (req, res, next) => {
  logger.info("Forgot password start", { email: req.body?.email });

  const users = getUserRepository();
  const user = await findUserByEmail(req.body.email, {
    includePassword: false,
  }, users);

  if (!user) return next(new AppError("No user with that email", 404));

  const resetToken = await assignPasswordResetToUser(user.id, users);

  try {
    const resetURL = authActionUrl("reset-password", resetToken);

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: "success",
      message: "Password reset token sent to email",
    });

    logger.info("Password reset token sent", { userId: user.id });
  } catch (err) {
    await updateUser(user.id, {
      passwordResetToken: null,
      passwordResetExpires: null,
    }, users);

    logger.error("Forgot password email failed", {
      error: err.message,
      userId: user.id,
    });

    return next(new AppError("Error sending email", 500));
  }
});

/* ===========================================================
   RESET PASSWORD
   @desc   RESET USER PASSWORD
   @route  POST /api/auth/reset-password/:token
   @access Public
=========================================================== */
export const resetPassword = asyncHandler(async (req, res, next) => {
  const users = getUserRepository();
  logger.info("Reset password start");

  const user = await verifyPasswordResetToken(req.params.token, users);

  validatePasswordConfirm(req.body.password, req.body.passwordConfirm);

  const resetUser = await consumeAuthToken(user.id, 'passwordResetToken', hashToken(req.params.token), 'passwordResetExpires', {
    password: req.body.password,
    passwordChangedAt: new Date().toISOString(),
    passwordResetToken: null,
    passwordResetExpires: null,
  }, users);

  if (!resetUser) return next(new AppError('Token is invalid or has expired', 400));

  const updatedUser = await findUserById(user.id, {}, users);
  await createSendToken(updatedUser, 200, res, users);

  logger.info("Password reset", { userId: user.id });
});

/* ===========================================================
   UPDATE PASSWORD (LOGGED IN)
   @desc   UPDATE CURRENT USER PASSWORD
   @route  PATCH /api/auth/update-password
   @access Private
=========================================================== */
export const updatePassword = asyncHandler(async (req, res, next) => {
  const users = getUserRepository();
  logger.info("Update password start", { userId: req.user.id });

  const { passwordCurrent, password, passwordConfirm } = req.body;

  if (!passwordCurrent || !password || !passwordConfirm) {
    return next(
      new AppError(
        "Please provide current password, new password and passwordConfirm",
        400
      )
    );
  }

  const user = await findUserById(req.user.id, { includePassword: true }, users);

  if (!user) return next(new AppError("User not found", 404));

  if (!(await comparePassword(passwordCurrent, user.password))) {
    return next(new AppError("Your current password is wrong.", 401));
  }

  validatePasswordConfirm(password, passwordConfirm);

  await updateUser(user.id, {
    password,
    passwordChangedAt: new Date().toISOString(),
  }, users);

  const updatedUser = await findUserById(user.id, {}, users);
  await createSendToken(updatedUser, 200, res, users);

  logger.info("Password updated", { userId: user.id });
});

/* ===========================================================
   ENABLE 2FA
   @desc   ENABLE TWO-FACTOR AUTHENTICATION
   @route  POST /api/auth/2fa/enable
   @access Private
=========================================================== */
export const enableTwoFactor = asyncHandler(async (req, res, next) => {
  if (req.user.twoFactorEnabled) {
    return next(new AppError("Disable existing two-factor authentication before setting it up again.", 409));
  }
  const users = getUserRepository();
  logger.info("Enable 2FA start", { userId: req.user.id });

  const { password } = req.body;

  if (!password) {
    return next(
      new AppError(
        "Password is required to enable two-factor authentication",
        400
      )
    );
  }

  const user = await findUserById(req.user.id, { includePassword: true }, users);

  if (!user) return next(new AppError("User not found", 404));

  if (!(await comparePassword(password, user.password))) {
    return next(new AppError("Incorrect password", 401));
  }

  const secret = generate2FASecret(user.email);

  await updateUser(user.id, {
    twoFactorSecret: secret.base32,
    twoFactorEnabled: false,
  }, users);

  res.status(200).json({
    status: "success",
    data: {
      otpauthUrl: secret.otpauth_url,
      secret: secret.base32,
    },
  });

  logger.info("2FA secret issued", { userId: user.id });
});

/* ===========================================================
   DISABLE 2FA
   @desc   DISABLE TWO-FACTOR AUTHENTICATION
   @route  POST /api/auth/2fa/disable
   @access Private
=========================================================== */
export const disableTwoFactor = asyncHandler(async (req, res, next) => {
  const users = getUserRepository();
  logger.info("Disable 2FA start", { userId: req.user.id });

  const { password, token } = req.body;

  if (!password || !token) {
    return next(
      new AppError(
        "Password and two-factor token are required to disable 2FA",
        400
      )
    );
  }

  const user = await findUserById(req.user.id, {
    includePassword: true,
  }, users);

  if (!user) return next(new AppError("User not found", 404));

  if (!(await comparePassword(password, user.password))) {
    return next(new AppError("Incorrect password", 401));
  }

  const verified = verify2FAToken(user.twoFactorSecret, token);
  if (!verified) {
    return next(new AppError("Invalid verification code", 400));
  }

  await updateUser(user.id, {
    twoFactorEnabled: false,
    twoFactorSecret: null,
  }, users);

  res.status(200).json({
    status: "success",
    message: "Two-factor authentication disabled successfully",
  });

  logger.info("2FA disabled", { userId: user.id });
});

/* ===========================================================
   VERIFY 2FA SETUP
   @desc   VERIFY TWO-FACTOR AUTHENTICATION SETUP
   @route  POST /api/auth/2fa/verify
   @access Private
=========================================================== */
export const verifyTwoFactor = asyncHandler(async (req, res, next) => {
  const users = getUserRepository();
  logger.info("Verify 2FA start", { userId: req.user.id });

  const { token } = req.body;

  if (!token) {
    return next(new AppError("Verification token is required", 400));
  }

  const user = await findUserById(req.user.id, {
    includePassword: false,
  }, users);

  if (!user.twoFactorSecret) {
    return next(new AppError("2FA is not initialized for this user", 400));
  }

  const verified = verify2FAToken(user.twoFactorSecret, token);
  if (!verified) {
    return next(new AppError("Invalid verification code", 400));
  }

  await updateUser(user.id, {
    twoFactorEnabled: true,
  }, users);

  res.status(200).json({
    status: "success",
    message: "Two-factor authentication enabled successfully",
  });

  logger.info("2FA enabled", { userId: user.id });
});

/* ===========================================================
   REFRESH TOKEN
   @desc   REFRESH JWT TOKEN
   @route  POST /api/auth/refresh
   @access Private
=========================================================== */
export const refreshToken = asyncHandler(async (req, res, next) => {
  const users = getUserRepository();
  const presentedRefreshToken = req.cookies?.refresh_token;
  if (!presentedRefreshToken) {
    return next(new AppError("Refresh token is missing", 401));
  }

  let decoded;
  try {
    decoded = verifyJWT(presentedRefreshToken, "refresh");
  } catch (err) {
    return next(new AppError("Invalid or expired refresh token", 401));
  }

  const user = await findUserById(decoded.userId, { includePassword: false }, users);
  if (!user || !user.active) {
    return next(new AppError("User not found or inactive", 401));
  }

  if (user.passwordChangedAt && decoded.issuedAtMs < new Date(user.passwordChangedAt).getTime()) {
    return next(new AppError("Password recently changed. Login again.", 401));
  }

  if (!user.refreshTokenHash || !user.refreshTokenExpires) {
    return next(new AppError("Refresh session not found", 401));
  }

  const presentedHash = hashToken(presentedRefreshToken);
  if (presentedHash !== user.refreshTokenHash) {
    return next(new AppError("Refresh token mismatch", 401));
  }

  if (new Date(user.refreshTokenExpires).getTime() < Date.now()) {
    return next(new AppError("Refresh token expired", 401));
  }

  await createSendToken(user, 200, res, users, presentedHash);
  logger.info("Token rotated", { userId: user.id });
});

export const csrfToken = asyncHandler(async (req, res) => {
  res.set("Cache-Control", "no-store");
  let anonSession = req.cookies?.anon_session;
  if (!anonSession && !req.cookies?.refresh_token) {
    anonSession = crypto.randomBytes(16).toString("hex");
    res.cookie("anon_session", anonSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
  }

  const binding = req.cookies?.refresh_token
    ? `refresh:${req.cookies.refresh_token}`
    : `anon:${anonSession}`;
  const token = buildCsrfToken(binding);
  res.cookie("csrf_token", token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.status(200).json({
    success: true,
    data: { csrfToken: token },
  });
});

/* ===========================================================
   SEND VERIFICATION EMAIL
   @desc   RESEND EMAIL VERIFICATION
   @route  POST /api/auth/send-verification-email
   @access Private
=========================================================== */
// Password proof permits email recovery without issuing an unverified session.
export const resendVerification = asyncHandler(async (req, res, next) => {
  const users = getUserRepository();
  const user = await findUserByEmail(req.body.email, { includePassword: true }, users);
  if (!user || !(await comparePassword(req.body.password, user.password)) || user.active === false) {
    return next(new AppError('Incorrect email or password', 401));
  }
  if (user.isEmailVerified) {
    return res.json({ success: true, data: { message: 'Your email is already verified. You can sign in.' } });
  }
  const token = await assignEmailVerificationToUser(user.id, users);
  try {
    await new Email(user, authActionUrl('verify-email', token)).sendVerificationEmail();
  } catch (error) {
    // Do not clear a token that a concurrent resend may have just replaced.
    logger.error('Verification recovery email failed', { userId: user.id, code: error.code || 'MAIL_FAILURE' });
    return next(new AppError('Unable to send verification email. Please try again later.', 503));
  }
  res.json({ success: true, data: { message: 'Verification email sent. Open the newest link in your inbox or spam folder.' } });
});

export const sendVerificationEmail = asyncHandler(async (req, res, next) => {
  const users = getUserRepository();
  logger.info("Send verification email request", { userId: req.user?.id });

  const user = await findUserById(req.user.id, {}, users);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  if (user.isEmailVerified) {
    return next(new AppError("Email already verified", 400));
  }

  const verificationToken = await assignEmailVerificationToUser(user.id, users);

  try {
    const verificationUrl = authActionUrl("verify-email", verificationToken);

    await new Email(user, verificationUrl).sendVerificationEmail();

    res.status(200).json({
      status: "success",
      message: "Verification email sent successfully",
    });

    logger.info("Verification email sent", { userId: user.id });
  } catch (err) {
    await updateUser(user.id, {
      emailVerificationToken: null,
      emailVerificationExpires: null,
    }, users);

    logger.error("Email send failure", {
      error: err.message,
      userId: user.id,
    });

    return next(new AppError("Error sending email", 500));
  }
});
