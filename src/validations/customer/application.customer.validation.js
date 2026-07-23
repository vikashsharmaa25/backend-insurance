import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const isValidObjectId = (val) => objectIdRegex.test(val);

export const applyPolicySchema = z.object({
  body: z.object({
    planId: z.string({ required_error: 'Plan ID is required' }).refine(isValidObjectId, 'Invalid Plan ID'),
    optionId: z.string().refine(isValidObjectId, 'Invalid Option ID').optional().nullable(),
    sumInsuredId: z.string({ required_error: 'Sum Insured ID is required' }).refine(isValidObjectId, 'Invalid Sum Insured ID'),
    ageSlabId: z.string({ required_error: 'Age Slab ID is required' }).refine(isValidObjectId, 'Invalid Age Slab ID'),
    familyTypeId: z.string({ required_error: 'Family Type ID is required' }).refine(isValidObjectId, 'Invalid Family Type ID'),
    applicantDetails: z.object({
      fullName: z.string().min(1, 'Full name is required'),
      email: z.string().email('Invalid email address'),
      phone: z.string().min(10, 'Invalid phone number'),
      dob: z.string().min(1, 'Date of birth is required'),
      gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
      panNumber: z.string().optional(),
      aadhaarNumber: z.string().optional(),
      address: z
        .object({
          street: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          pincode: z.string().optional(),
        })
        .optional(),
    }),
    insuredMembers: z
      .array(
        z.object({
          name: z.string().min(1, 'Member name is required'),
          relation: z.string().min(1, 'Relation is required'),
          dob: z.string().min(1, 'DOB is required'),
          gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
          hasPreExistingDisease: z.boolean().optional().default(false),
          medicalNotes: z.string().optional().default(''),
        })
      )
      .min(1, 'At least one insured member is required'),
    nominee: z.object({
      name: z.string().min(1, 'Nominee name is required'),
      relation: z.string().min(1, 'Nominee relation is required'),
      age: z.number().min(0, 'Nominee age cannot be negative'),
      phone: z.string().optional(),
    }),
    paymentDetails: z.object({
      transactionId: z.string().min(1, 'Transaction ID is required'),
      paymentMode: z.enum(['UPI', 'NET_BANKING', 'CREDIT_CARD', 'DEBIT_CARD', 'WALLET']).optional().default('UPI'),
      paidAmount: z.number().positive('Paid amount must be positive'),
    }),
  }),
});
