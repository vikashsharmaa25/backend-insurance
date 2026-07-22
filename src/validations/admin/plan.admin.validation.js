import { z } from 'zod';

const statusEnum = z.enum(['active', 'inactive'], {
  invalid_type_error: 'Status must be either active or inactive',
});

// --- Insurance Plan Validation Schemas ---
export const createPlanSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Plan name is required' })
      .min(1, 'Plan name cannot be empty')
      .max(100, 'Plan name cannot exceed 100 characters'),
    slug: z.string().min(1, 'Slug cannot be empty').optional(),
    shortDescription: z.string().optional(),
    description: z.string().optional(),
    logo: z.string().optional(),
    status: statusEnum.optional().default('active'),
  }),
});

export const updatePlanSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Plan name cannot be empty').max(100).optional(),
    slug: z.string().min(1).optional(),
    shortDescription: z.string().optional(),
    description: z.string().optional(),
    logo: z.string().optional(),
    status: statusEnum.optional(),
  }),
});

// --- Plan Option Validation Schemas ---
export const createPlanOptionSchema = z.object({
  body: z.object({
    planId: z.string({ required_error: 'Plan ID is required' }).min(1, 'Plan ID cannot be empty'),
    name: z
      .string({ required_error: 'Option name is required' })
      .min(1, 'Option name cannot be empty')
      .max(100, 'Option name cannot exceed 100 characters'),
    description: z.string().optional(),
    status: statusEnum.optional().default('active'),
  }),
});

export const updatePlanOptionSchema = z.object({
  body: z.object({
    planId: z.string().min(1).optional(),
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    status: statusEnum.optional(),
  }),
});

// --- Coverage Validation Schemas ---
export const createCoverageSchema = z.object({
  body: z.object({
    title: z
      .string({ required_error: 'Coverage title is required' })
      .min(1, 'Title cannot be empty')
      .max(100, 'Title cannot exceed 100 characters'),
    description: z.string().optional(),
    icon: z.string().optional(),
    status: statusEnum.optional().default('active'),
  }),
});

export const updateCoverageSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    icon: z.string().optional(),
    status: statusEnum.optional(),
  }),
});

// --- Sum Insured Validation Schemas ---
export const createSumInsuredSchema = z.object({
  body: z.object({
    amount: z
      .number({ required_error: 'Amount is required' })
      .positive('Amount must be a positive number'),
    displayName: z
      .string({ required_error: 'Display name is required' })
      .min(1, 'Display name cannot be empty'),
    status: statusEnum.optional().default('active'),
  }),
});

export const updateSumInsuredSchema = z.object({
  body: z.object({
    amount: z.number().positive('Amount must be a positive number').optional(),
    displayName: z.string().min(1).optional(),
    status: statusEnum.optional(),
  }),
});

// --- Age Slab Validation Schemas ---
export const createAgeSlabSchema = z.object({
  body: z
    .object({
      minAge: z
        .number({ required_error: 'Minimum age is required' })
        .min(0, 'Minimum age cannot be negative'),
      maxAge: z
        .number({ required_error: 'Maximum age is required' })
        .min(0, 'Maximum age cannot be negative'),
      displayName: z
        .string({ required_error: 'Display name is required' })
        .min(1, 'Display name cannot be empty'),
      status: statusEnum.optional().default('active'),
    })
    .refine((data) => data.maxAge >= data.minAge, {
      message: 'Maximum age must be greater than or equal to minimum age',
      path: ['maxAge'],
    }),
});

export const updateAgeSlabSchema = z.object({
  body: z.object({
    minAge: z.number().min(0).optional(),
    maxAge: z.number().min(0).optional(),
    displayName: z.string().min(1).optional(),
    status: statusEnum.optional(),
  }),
});

// --- Family Type Validation Schemas ---
export const createFamilyTypeSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Name is required' })
      .min(1, 'Name cannot be empty'),
    code: z
      .string({ required_error: 'Code is required' })
      .min(1, 'Code cannot be empty'),
    adultCount: z
      .number({ required_error: 'Adult count is required' })
      .min(0, 'Adult count cannot be negative'),
    childCount: z
      .number({ required_error: 'Child count is required' })
      .min(0, 'Child count cannot be negative'),
    status: statusEnum.optional().default('active'),
  }),
});

export const updateFamilyTypeSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    adultCount: z.number().min(0).optional(),
    childCount: z.number().min(0).optional(),
    status: statusEnum.optional(),
  }),
});

// --- Generic Status Toggle Validation Schema ---
export const statusToggleSchema = z.object({
  body: z.object({
    status: statusEnum,
  }),
});
