import { z } from 'zod';

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Enter a valid email address');

export const passwordSchema = z
  .string()
  .min(9, 'Use at least 9 characters')
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/[^A-Za-z0-9]/, 'Include a special character');

export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

export const signupFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be 100 characters or fewer'),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password')
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

export const forgotPasswordFormSchema = z.object({
  email: emailSchema
});

export const resetPasswordFormSchema = z
  .object({
    token: z.string().min(1, 'Reset token is missing'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password')
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

export const staffFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be 100 characters or fewer'),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(['ADMIN', 'STAFF'])
});

export const staffUpdateFormSchema = staffFormSchema.pick({
  name: true,
  email: true
});

function requiredAmount(label: string) {
  return z.preprocess(
    (value) => {
      if (value === '' || value === null || value === undefined) return undefined;
      return typeof value === 'string' ? Number(value) : value;
    },
    z.number({ error: `${label} is required` }).nonnegative(`${label} cannot be negative`)
  );
}

const extraAmount = z.preprocess(
  (value) => {
    if (value === '' || value === null || value === undefined) return 0;
    return typeof value === 'string' ? Number(value) : value;
  },
  z.number({ error: 'Enter a valid amount' }).nonnegative('Extra price cannot be negative')
);

const minimumQuantity = z.preprocess(
  (value) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return typeof value === 'string' ? Number(value) : value;
  },
  z
    .number({ error: 'Minimum quantity is required' })
    .int('Use a whole number')
    .min(1, 'Minimum quantity must be at least 1')
);

const variantFormSchema = z.object({
  attribute: z
    .string()
    .trim()
    .min(1, 'Attribute is required')
    .max(100, 'Attribute must be 100 characters or fewer'),
  value: z
    .string()
    .trim()
    .min(1, 'Value is required')
    .max(100, 'Value must be 100 characters or fewer'),
  extraPrice: extraAmount
});

export const productFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Product name must be at least 2 characters')
      .max(120, 'Product name must be 120 characters or fewer'),
    type: z.enum(['GOODS', 'SERVICE']),
    salesPrice: requiredAmount('Sales price'),
    costPrice: requiredAmount('Cost price'),
    notes: z.string().max(5000, 'Notes must be 5,000 characters or fewer').optional(),
    variants: z.array(variantFormSchema).default([])
  })
  .superRefine((data, context) => {
    const seen = new Map<string, number>();
    data.variants.forEach((variant, index) => {
      const key = `${variant.attribute.trim().toLowerCase()}::${variant.value
        .trim()
        .toLowerCase()}`;
      const firstIndex = seen.get(key);
      if (firstIndex !== undefined) {
        context.addIssue({
          code: 'custom',
          message: 'This attribute and value combination is already used',
          path: ['variants', index, 'value']
        });
      } else {
        seen.set(key, index);
      }
    });
  });

export const planFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Plan name must be at least 2 characters')
      .max(120, 'Plan name must be 120 characters or fewer'),
    price: requiredAmount('Price'),
    frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
    minimumQuantity,
    availableFrom: z.string().optional(),
    availableUntil: z.string().optional(),
    autoClose: z.boolean(),
    allowEarlyClose: z.boolean(),
    allowPause: z.boolean(),
    allowRenew: z.boolean()
  })
  .superRefine((data, context) => {
    const from = data.availableFrom ? new Date(data.availableFrom) : null;
    const until = data.availableUntil ? new Date(data.availableUntil) : null;

    if (from && Number.isNaN(from.getTime())) {
      context.addIssue({
        code: 'custom',
        message: 'Enter a valid start date',
        path: ['availableFrom']
      });
    }
    if (until && Number.isNaN(until.getTime())) {
      context.addIssue({
        code: 'custom',
        message: 'Enter a valid end date',
        path: ['availableUntil']
      });
    }
    if (from && until && !Number.isNaN(from.getTime()) && !Number.isNaN(until.getTime())) {
      if (until < from) {
        context.addIssue({
          code: 'custom',
          message: 'Available until cannot be before available from',
          path: ['availableUntil']
        });
      }
    }
  });

function optionalId() {
  return z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.string().optional()
  );
}

function optionalAmount(label: string) {
  return z.preprocess(
    (value) => {
      if (value === '' || value === null || value === undefined) return undefined;
      return typeof value === 'string' ? Number(value) : value;
    },
    z
      .number({ error: `Enter a valid ${label}` })
      .nonnegative(`${label} cannot be negative`)
      .optional()
  );
}

function wholeNumber(label: string, minimum: number, maximum?: number) {
  return z.preprocess(
    (value) => {
      if (value === '' || value === null || value === undefined) return undefined;
      return typeof value === 'string' ? Number(value) : value;
    },
    z
      .number({ error: `${label} is required` })
      .int('Use a whole number')
      .min(minimum, `${label} must be at least ${minimum}`)
      .max(maximum ?? Number.MAX_SAFE_INTEGER, `${label} must be ${maximum} or less`)
  );
}

const taxRate = z.preprocess(
  (value) => {
    if (value === '' || value === null || value === undefined) return 0;
    return typeof value === 'string' ? Number(value) : value;
  },
  z
    .number({ error: 'Enter a valid tax rate' })
    .min(0, 'Tax rate cannot be negative')
    .max(100, 'Tax rate cannot exceed 100')
);

const lineQuantity = wholeNumber('Quantity', 1);

export const paymentTermFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Payment term name must be at least 2 characters')
    .max(120, 'Payment term name must be 120 characters or fewer'),
  dueDays: wholeNumber('Due days', 0, 365),
  isActive: z.boolean()
});

const quotationLineFormSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  variantId: optionalId(),
  quantity: lineQuantity,
  unitPrice: optionalAmount('unit price'),
  taxRate
});

export const quotationFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Quotation name must be at least 2 characters')
    .max(120, 'Quotation name must be 120 characters or fewer'),
  description: z.string().max(4000, 'Description must be 4,000 characters or fewer').optional(),
  validityDays: wholeNumber('Validity days', 1, 365),
  planId: optionalId(),
  isActive: z.boolean(),
  lines: z.array(quotationLineFormSchema).min(1, 'Add at least one product line')
});

const subscriptionLineFormSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  variantId: optionalId(),
  description: z.string().max(500, 'Description must be 500 characters or fewer').optional(),
  quantity: lineQuantity,
  unitPrice: optionalAmount('unit price'),
  taxRate
});

function dateRangeIssues(
  data: { startDate?: string; expiryDate?: string },
  context: z.RefinementCtx
) {
  const start = data.startDate ? new Date(data.startDate) : null;
  const expiry = data.expiryDate ? new Date(data.expiryDate) : null;

  if (start && Number.isNaN(start.getTime())) {
    context.addIssue({
      code: 'custom',
      message: 'Enter a valid start date',
      path: ['startDate']
    });
  }
  if (expiry && Number.isNaN(expiry.getTime())) {
    context.addIssue({
      code: 'custom',
      message: 'Enter a valid expiry date',
      path: ['expiryDate']
    });
  }
  if (start && expiry && !Number.isNaN(start.getTime()) && !Number.isNaN(expiry.getTime())) {
    if (expiry < start) {
      context.addIssue({
        code: 'custom',
        message: 'Expiry date cannot be before the start date',
        path: ['expiryDate']
      });
    }
  }
}

export const subscriptionFormSchema = z
  .object({
    customerId: z.string().min(1, 'Select a customer'),
    source: z.enum(['PLAN', 'TEMPLATE']),
    planId: optionalId(),
    quotationTemplateId: optionalId(),
    startDate: z.string().min(1, 'Start date is required'),
    expiryDate: z.string().optional(),
    paymentTermId: optionalId(),
    notes: z.string().max(4000, 'Notes must be 4,000 characters or fewer').optional(),
    lines: z.array(subscriptionLineFormSchema).default([])
  })
  .superRefine((data, context) => {
    if (data.source === 'PLAN' && !data.planId) {
      context.addIssue({
        code: 'custom',
        message: 'Select a plan',
        path: ['planId']
      });
    }
    if (data.source === 'TEMPLATE' && !data.quotationTemplateId) {
      context.addIssue({
        code: 'custom',
        message: 'Select a quotation template',
        path: ['quotationTemplateId']
      });
    }
    if (data.source === 'PLAN' && data.lines.length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'Add at least one product line',
        path: ['lines']
      });
    }
    dateRangeIssues(data, context);
  });

export const subscriptionEditFormSchema = z
  .object({
    startDate: z.string().min(1, 'Start date is required'),
    expiryDate: z.string().optional(),
    paymentTermId: optionalId(),
    notes: z.string().max(4000, 'Notes must be 4,000 characters or fewer').optional(),
    lines: z.array(subscriptionLineFormSchema).min(1, 'Add at least one product line')
  })
  .superRefine((data, context) => dateRangeIssues(data, context));

export const subscriptionRenewFormSchema = z
  .object({
    startDate: z.string().optional(),
    expiryDate: z.string().optional()
  })
  .superRefine((data, context) => dateRangeIssues(data, context));

export const cancelSubscriptionFormSchema = z.object({
  reason: z.string().max(500, 'Reason must be 500 characters or fewer').optional()
});

function discountNumber(label: string, minimum: number, integer = false) {
  const numberSchema = z
    .number({ error: `${label} is required` })
    .min(minimum, `${label} must be ${minimum} or greater`)
    .refine((value) => !integer || Number.isInteger(value), `${label} must be a whole number`);
  return z.preprocess(
    (value) => {
      if (value === '' || value === null || value === undefined) return Number.NaN;
      return typeof value === 'string' ? Number(value) : value;
    },
    numberSchema
  );
}

function optionalDiscountCount() {
  return z.preprocess(
    (value) => {
      if (value === '' || value === null || value === undefined) return undefined;
      return typeof value === 'string' ? Number(value) : value;
    },
    z.number({ error: 'Maximum usage count must be a whole number' })
      .int('Maximum usage count must be a whole number')
      .positive('Maximum usage count must be greater than zero')
      .optional()
  );
}

export const discountRuleFormSchema = z
  .object({
    name: z.string().trim().min(2, 'Rule name must be at least 2 characters').max(120),
    description: z.string().max(2000).optional(),
    type: z.enum(['FIXED', 'PERCENTAGE']),
    scope: z.enum(['PRODUCT', 'SUBSCRIPTION']),
    value: discountNumber('Discount value', 0.01),
    minPurchase: discountNumber('Minimum purchase', 0),
    minQuantity: discountNumber('Minimum quantity', 0, true),
    maxUsageCount: optionalDiscountCount(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    productId: z.string().optional()
  })
  .superRefine((data, context) => {
    const starts = data.startsAt ? new Date(data.startsAt) : null;
    const ends = data.endsAt ? new Date(data.endsAt) : null;
    if (starts && Number.isNaN(starts.getTime())) {
      context.addIssue({ code: 'custom', message: 'Enter a valid start date', path: ['startsAt'] });
    }
    if (ends && Number.isNaN(ends.getTime())) {
      context.addIssue({ code: 'custom', message: 'Enter a valid end date', path: ['endsAt'] });
    }
    if (starts && ends && !Number.isNaN(starts.getTime()) && !Number.isNaN(ends.getTime()) && ends < starts) {
      context.addIssue({ code: 'custom', message: 'End date cannot be before start date', path: ['endsAt'] });
    }
    if (data.type === 'PERCENTAGE' && data.value > 100) {
      context.addIssue({ code: 'custom', message: 'Percentage cannot exceed 100', path: ['value'] });
    }
    if (data.scope === 'PRODUCT' && !data.productId) {
      context.addIssue({ code: 'custom', message: 'Select a target product', path: ['productId'] });
    }
  });

export const passwordChecks = [
  { label: 'At least 9 characters', test: (value: string) => value.length >= 9 },
  { label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'One special character', test: (value: string) => /[^A-Za-z0-9]/.test(value) }
] as const;

export function passwordStrength(value: string): {
  score: number;
  label: string;
  tone: 'weak' | 'fair' | 'good' | 'strong';
} {
  const passed = passwordChecks.filter((check) => check.test(value)).length;
  const bonus = value.length >= 12 ? 1 : 0;
  const score = Math.min(4, passed + bonus);

  if (score <= 1) return { score, label: 'Weak', tone: 'weak' };
  if (score === 2) return { score, label: 'Fair', tone: 'fair' };
  if (score === 3) return { score, label: 'Good', tone: 'good' };
  return { score, label: 'Strong', tone: 'strong' };
}
