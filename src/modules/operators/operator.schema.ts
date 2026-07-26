/**
 * operators/operator.schema.ts
 */

import { z } from 'zod';

export const CreateOperatorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone must be at least 10 digits').max(15, 'Phone cannot exceed 15 digits'),
});

export type CreateOperatorDto = z.infer<typeof CreateOperatorSchema>;
