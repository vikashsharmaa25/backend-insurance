import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const isValidObjectId = (val) => objectIdRegex.test(val);

export const createOrUpdatePolicyConditionSchema = z.object({
  body: z.object({
    planId: z
      .string({ required_error: 'Plan ID is required' })
      .refine(isValidObjectId, 'Invalid Plan ID format'),
    ageBand: z.string().optional(),
    familyDefinition: z.string().optional(),
    planType: z.string().optional(),
    sumInsuredOptions: z.string().optional(),
    tenure: z.string().optional(),
    roomRentLimit: z.string().optional(),
    dayCareTreatment: z.string().optional(),
    prePostHospitalization: z.string().optional(),
    ayushHospitalization: z.string().optional(),
    unlimitedResetBenefit: z.string().optional(),
    loyaltyBonus: z.string().optional(),
    donorExpenses: z.string().optional(),
    domiciliaryHospitalization: z.string().optional(),
    ambulanceCoverLimit: z.number().min(0).optional(),
    maternityLimit: z.number().min(0).optional(),
    newBornLimit: z.number().min(0).optional(),
    coPayPercentage: z.number().min(0).max(100).optional(),
    initialWaitingPeriodDays: z.number().min(0).optional(),
    specificIllnessWaitingDays: z.number().min(0).optional(),
    preExistingDiseaseWaitingMonths: z.number().min(0).optional(),
    diseaseSubLimits: z
      .array(
        z.object({
          diseaseName: z.string().min(1, 'Disease name cannot be empty'),
          limitAmount: z.number().min(0, 'Limit amount cannot be negative'),
        })
      )
      .optional(),
    exclusions: z.array(z.string()).optional(),
    claimSubmissionDays: z.number().min(1).optional(),
  }),
});
