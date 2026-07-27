import { z } from 'zod';

/**
 * Zod validation schema for Order Creation payload
 */
export const createOrderSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  items: z.array(
    z.object({
      productId: z.string().min(1, 'Product ID is required'),
      quantity: z.number().int().positive('Quantity must be greater than 0'),
      price: z.number().positive('Price must be greater than 0'),
    })
  ).min(1, 'Order must contain at least one item'),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
