import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const isValidObjectId = (val) => objectIdRegex.test(val);

export const submitKycSchema = z.object({
  body: z.object({
    dob: z.string({ required_error: 'Date of birth is required' }).min(1, 'DOB cannot be empty'),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER'], { required_error: 'Gender must be MALE, FEMALE, or OTHER' }),
    panNumber: z.string().min(10, 'Invalid PAN number').max(10, 'Invalid PAN number').optional(),
    aadhaarNumber: z.string().min(12, 'Invalid Aadhaar number').max(12, 'Invalid Aadhaar number').optional(),
    address: z
      .object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        pincode: z.string().optional(),
      })
      .optional(),
    idProofUrl: z.string().optional(),
  }),
});

export const explorePlansSchema = z.object({
  body: z.object({
    dob: z.string({ required_error: 'Date of birth is required' }).min(1, 'DOB cannot be empty'),
    familyTypeId: z
      .string({ required_error: 'Family Type ID is required' })
      .refine(isValidObjectId, 'Invalid Family Type ID'),
    sumInsuredId: z
      .string({ required_error: 'Sum Insured ID is required' })
      .refine(isValidObjectId, 'Invalid Sum Insured ID'),
    planId: z.string().refine(isValidObjectId, 'Invalid Plan ID').optional(),
  }),
});

export const createProposalSchema = z.object({
  body: z.object({
    planId: z.string({ required_error: 'Plan ID is required' }).refine(isValidObjectId, 'Invalid Plan ID'),
    optionId: z.string({ required_error: 'Option ID is required' }).refine(isValidObjectId, 'Invalid Option ID'),
    sumInsuredId: z.string({ required_error: 'Sum Insured ID is required' }).refine(isValidObjectId, 'Invalid Sum Insured ID'),
    ageSlabId: z.string({ required_error: 'Age Slab ID is required' }).refine(isValidObjectId, 'Invalid Age Slab ID'),
    familyTypeId: z.string({ required_error: 'Family Type ID is required' }).refine(isValidObjectId, 'Invalid Family Type ID'),
    insuredMembers: z
      .array(
        z.object({
          name: z.string().min(1, 'Member name is required'),
          relation: z.string().min(1, 'Relation is required'),
          dob: z.string().min(1, 'Member DOB is required'),
          gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
        })
      )
      .min(1, 'At least one insured member is required'),
    nominee: z.object({
      name: z.string().min(1, 'Nominee name is required'),
      relation: z.string().min(1, 'Nominee relation is required'),
      age: z.number().min(0, 'Nominee age cannot be negative'),
    }),
  }),
});
