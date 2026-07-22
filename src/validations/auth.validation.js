import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    firstName: z
      .string({ required_error: 'First name is required' })
      .min(1, 'First name cannot be empty')
      .max(50, 'First name cannot exceed 50 characters'),
    lastName: z
      .string({ required_error: 'Last name is required' })
      .min(1, 'Last name cannot be empty')
      .max(50, 'Last name cannot exceed 50 characters'),
    email: z
      .string({ required_error: 'Email is required' })
      .email('Invalid email address'),
    phone: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
      .optional()
      .or(z.literal('')),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters long'),
  }),
});

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
    firstName: z
      .string()
      .min(1, 'First name cannot be empty')
      .max(50, 'First name cannot exceed 50 characters')
      .optional(),
    lastName: z
      .string()
      .min(1, 'Last name cannot be empty')
      .max(50, 'Last name cannot exceed 50 characters')
      .optional(),
    phone: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
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
