import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  register,
  sendOtp,
  verifyOtp,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  logout,
  getCurrentUser,
  login,
  changePassword,
  updateProfile,
} from '../controllers/auth.controller.js';
import {
  registerSchema,
  sendOtpSchema,
  verifyOtpSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
} from '../validations/auth.validation.js';

const router = Router();

// ─── Public routes ───────────────────────────────────────────────────────────

// New OTP-based auth flow
router.post('/register', validate(registerSchema), register);
router.post('/send-otp', validate(sendOtpSchema), sendOtp);
router.post('/verify-otp', validate(verifyOtpSchema), verifyOtp);

// Token refresh (used by Axios interceptor)
router.post('/refresh-token', refreshAccessToken);

// Legacy password-based routes (backward compat)
router.post('/login', validate(loginSchema), login);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

// ─── Protected routes (Require login) ────────────────────────────────────────
router.use(authenticate);

router.post('/logout', logout);
router.get('/me', getCurrentUser);
router.patch('/change-password', validate(changePasswordSchema), changePassword);
router.patch('/update-profile', validate(updateProfileSchema), updateProfile);

export default router;
