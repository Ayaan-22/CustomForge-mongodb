// server/routes/authRoutes.js
// Mount: /api/v1/auth
// PUBLIC: register, login, logout, verify-email, forgot/reset password, refresh, csrf-token.
// After router.use(protect): update-password, 2FA — logged-in + verified email.

import express from "express";
import {
  signup,
  login,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  updatePassword,
  enableTwoFactor,
  verifyTwoFactor,
  disableTwoFactor,
  refreshToken,
  sendVerificationEmail,
  resendVerification,
  csrfToken,
} from "../controllers/authController.js";

import { loginLimiter } from "../controllers/authController.js";

import {
  protect,
  verifiedEmail,
  twoFactorAuth,
} from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendVerificationSchema,
} from "../validation/authSchemas.js";
import { verificationAccountLimiter, userActionLimiter } from '../config/rateLimit.js';

const router = express.Router();

/* ============================
   PUBLIC AUTH ROUTES
   ============================ */
router.post("/register", validate(registerSchema), signup);
router.post("/login", validate(loginSchema), loginLimiter, login);
router.post('/resend-verification', validate(resendVerificationSchema), verificationAccountLimiter, resendVerification);
router.post("/logout", logout);

router.post("/verify-email/:token", verifyEmail);
/* protect only — unverified users must be able to resend. Placed before router.use(verifiedEmail). */
router.post("/send-verification-email", protect, sendVerificationEmail);

router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password/:token", validate(resetPasswordSchema), resetPassword);

/* ============================
   TOKEN REFRESH
   ============================ */
router.post("/refresh", refreshToken);
router.get("/csrf-token", csrfToken);

/* ============================
   PROTECTED ROUTES – Must be logged in + verified email
   ============================ */
router.use(protect);
router.use(userActionLimiter);
router.use(verifiedEmail);

/* ============================
   PASSWORD UPDATE (must have 2FA if enabled)
   ============================ */
router.patch("/update-password", twoFactorAuth, updatePassword);

/* ============================
   2FA SETUP FLOW
   ============================ */

// STEP 1 - Generate initial secret; controller rejects re-enrollment while 2FA is enabled.
router.post("/2fa/enable", enableTwoFactor);

// STEP 2 - Verify secret (NO 2FA required – this is onboarding)
router.post("/2fa/verify", verifyTwoFactor);

// STEP 3 - Disable 2FA (YES 2FA REQUIRED)
router.delete("/2fa/disable", twoFactorAuth, disableTwoFactor);

export default router;
