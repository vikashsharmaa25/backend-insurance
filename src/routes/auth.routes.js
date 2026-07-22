import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  register,
  login,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  logout,
  getCurrentUser,
  changePassword,
  updateProfile,
} from '../controllers/auth.controller.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
} from '../validations/auth.validation.js';

const router = Router();

// Public routes
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh-token', refreshAccessToken);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

// Protected routes (Require login)
router.use(authenticate);

router.post('/logout', logout);
router.get('/me', getCurrentUser);
router.patch('/change-password', validate(changePasswordSchema), changePassword);
router.patch('/update-profile', validate(updateProfileSchema), updateProfile);

export default router;
