import { z } from 'zod';

// Phone regex: supports international format e.g. +919876543210 or 9876543210
const phoneRegex = /^\+?[1-9]\d{6,14}$/;

export const registerSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Name is required' })
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters'),
    email: z
      .string({ required_error: 'Email is required' })
      .email('Invalid email address'),
    phone: z
      .string({ required_error: 'Phone number is required' })
      .regex(phoneRegex, 'Invalid phone number format (e.g. 9876543210 or +919876543210)'),
    dob: z.string().optional().nullable(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
  }),
});

export const sendOtpSchema = z.object({
  body: z.object({
    phone: z
      .string({ required_error: 'Phone number is required' })
      .regex(phoneRegex, 'Invalid phone number format'),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    phone: z
      .string({ required_error: 'Phone number is required' })
      .regex(phoneRegex, 'Invalid phone number format'),
    otp: z
      .string({ required_error: 'OTP is required' })
      .length(6, 'OTP must be exactly 6 digits')
      .regex(/^\d{6}$/, 'OTP must contain only digits'),
  }),
});

// ----- Legacy schemas (kept for backward compat) -----

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .email('Invalid email address'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(1, 'Password cannot be empty'),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z
      .string({ required_error: 'Old password is required' })
      .min(1, 'Old password cannot be empty'),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(8, 'New password must be at least 8 characters long'),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters')
      .optional(),
    email: z
      .string()
      .email('Invalid email address')
      .optional(),
    phone: z
      .string()
      .regex(phoneRegex, 'Invalid phone number format')
      .optional()
      .or(z.literal('')),
    profileImage: z
      .string()
      .url('Invalid profile image URL')
      .optional()
      .or(z.literal('')),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .email('Invalid email address'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z
      .string({ required_error: 'Reset token is required' })
      .min(1, 'Reset token cannot be empty'),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(8, 'New password must be at least 8 characters long'),
  }),
});
