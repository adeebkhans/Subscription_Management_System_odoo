import { z } from 'zod';
import { paginationSchema } from '../../core/http/pagination.js';

const discountFields = {
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  type: z.enum(['FIXED', 'PERCENTAGE']),
  scope: z.enum(['PRODUCT', 'SUBSCRIPTION']),
  value: z.number().positive(),
  minPurchase: z.number().nonnegative().default(0),
  minQuantity: z.number().int().nonnegative().default(0),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  maxUsageCount: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
  productId: z.string().uuid().optional()
};

export const discountRuleValidator = z.object(discountFields)
  .superRefine((input, context) => {
    if (input.type === 'PERCENTAGE' && input.value > 100) {
      context.addIssue({
        code: z.ZodIssueCode.too_big,
        maximum: 100,
        type: 'number',
        inclusive: true,
        path: ['value'],
        message: 'Percentage discounts cannot exceed 100'
      });
    }
    if (input.scope === 'PRODUCT' && !input.productId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['productId'],
        message: 'Product discounts require a product'
      });
    }
    if (input.scope === 'SUBSCRIPTION' && input.productId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['productId'],
        message: 'Subscription discounts cannot target a product'
      });
    }
    if (input.startsAt && input.endsAt && input.endsAt < input.startsAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endsAt'],
        message: 'End date cannot be before start date'
      });
    }
  });

export const discountRuleUpdateValidator = z.object({
  name: discountFields.name.optional(),
  description: discountFields.description.nullable().optional(),
  type: discountFields.type.optional(),
  scope: discountFields.scope.optional(),
  value: discountFields.value.optional(),
  minPurchase: discountFields.minPurchase.optional(),
  minQuantity: discountFields.minQuantity.optional(),
  startsAt: discountFields.startsAt.nullable().optional(),
  endsAt: discountFields.endsAt.nullable().optional(),
  maxUsageCount: discountFields.maxUsageCount.nullable().optional(),
  isActive: discountFields.isActive.optional(),
  productId: z.string().uuid().nullable().optional()
}).refine((input) => Object.keys(input).length > 0, {
  message: 'At least one field must be updated'
});

export const discountRuleListQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  type: z.enum(['FIXED', 'PERCENTAGE']).optional(),
  scope: z.enum(['PRODUCT', 'SUBSCRIPTION']).optional(),
  isActive: z.enum(['true', 'false']).transform((value) => value === 'true').optional()
});
