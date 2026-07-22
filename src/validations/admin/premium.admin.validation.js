import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const isValidObjectId = (val) => objectIdRegex.test(val);

export const createPremiumRateSchema = z.object({
  body: z.object({
    planId: z
      .string({ required_error: 'Plan ID is required' })
      .refine(isValidObjectId, 'Invalid Plan ID format'),
    optionId: z
      .string({ required_error: 'Option ID is required' })
      .refine(isValidObjectId, 'Invalid Option ID format'),
    sumInsuredId: z
      .string({ required_error: 'Sum Insured ID is required' })
      .refine(isValidObjectId, 'Invalid Sum Insured ID format'),
    ageSlabId: z
      .string({ required_error: 'Age Slab ID is required' })
      .refine(isValidObjectId, 'Invalid Age Slab ID format'),
    familyTypeId: z
      .string({ required_error: 'Family Type ID is required' })
      .refine(isValidObjectId, 'Invalid Family Type ID format'),
    basePremium: z
      .number({ required_error: 'Base premium is required' })
      .min(0, 'Base premium cannot be negative'),
    gstPercentage: z.number().min(0).optional().default(18),
    status: z.enum(['active', 'inactive']).optional().default('active'),
  }),
});

export const bulkPremiumRateSchema = z.object({
  body: z.object({
    rates: z
      .array(
        z.object({
          planId: z.string().refine(isValidObjectId, 'Invalid Plan ID'),
          optionId: z.string().refine(isValidObjectId, 'Invalid Option ID'),
          sumInsuredId: z.string().refine(isValidObjectId, 'Invalid Sum Insured ID'),
          ageSlabId: z.string().refine(isValidObjectId, 'Invalid Age Slab ID'),
          familyTypeId: z.string().refine(isValidObjectId, 'Invalid Family Type ID'),
          basePremium: z.number().min(0),
          gstPercentage: z.number().min(0).optional().default(18),
        })
      )
      .min(1, 'Rates array cannot be empty'),
  }),
});

export const mapPlanOptionCoverageSchema = z.object({
  body: z.object({
    planId: z
      .string({ required_error: 'Plan ID is required' })
      .refine(isValidObjectId, 'Invalid Plan ID format'),
    optionId: z
      .string({ required_error: 'Option ID is required' })
      .refine(isValidObjectId, 'Invalid Option ID format'),
    coverageId: z
      .string({ required_error: 'Coverage ID is required' })
      .refine(isValidObjectId, 'Invalid Coverage ID format'),
    isCovered: z.boolean().optional().default(true),
    value: z.string().optional().default('Yes'),
  }),
});
