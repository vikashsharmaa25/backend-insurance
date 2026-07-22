import { z } from 'zod';

export const updateApplicationStatusSchema = z.object({
  body: z
    .object({
      status: z.enum(['APPROVED', 'REJECTED'], { required_error: 'Status must be APPROVED or REJECTED' }),
      rejectionReason: z.string().optional(),
    })
    .refine(
      (data) => {
        if (data.status === 'REJECTED' && (!data.rejectionReason || data.rejectionReason.trim() === '')) {
          return false;
        }
        return true;
      },
      {
        message: 'Rejection reason is required when rejecting an application',
        path: ['rejectionReason'],
      }
    ),
});
