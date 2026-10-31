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
