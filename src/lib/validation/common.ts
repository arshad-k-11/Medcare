import { z } from 'zod';
import { PAGE_SIZE_MAX } from '../constants';

/** Reusable primitives so validation messages are consistent across every form. */

export const cuid = z.string().min(1, 'Required').max(64);

/** Indian mobile numbers, tolerant of spaces, dashes and +91. */
export const phone = z
  .string()
  .trim()
  .min(10, 'Enter a 10-digit mobile number')
  .max(20)
  .transform((value) => value.replace(/[\s-()]/g, ''))
  .refine(
    (value) => /^(\+?91)?[6-9]\d{9}$/.test(value),
    'Enter a valid Indian mobile number (for example 98765 43210)',
  )
  .transform((value) => (value.startsWith('+91') ? value : value.replace(/^91/, '')).slice(-10));

/** International numbers for NRI families, where +91 does not apply. */
export const internationalPhone = z
  .string()
  .trim()
  .min(7, 'Enter a valid phone number')
  .max(24)
  .transform((value) => value.replace(/[\s-()]/g, ''))
  .refine((value) => /^\+?\d{7,20}$/.test(value), 'Enter a valid phone number with country code');

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .max(200);

export const optionalEmail = z
  .union([email, z.literal('')])
  .optional()
  .transform((value) => (value === '' ? undefined : value));

/**
 * Password policy. Length is the dominant factor, so we require 10 characters and one
 * non-letter rather than a thicket of character-class rules that push people to
 * `Password1!`.
 */
export const password = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(200, 'That password is too long')
  .refine((value) => /[^a-zA-Z]/.test(value), 'Include at least one number or symbol');

export const personName = z
  .string()
  .trim()
  .min(2, 'Enter a name')
  .max(80)
  .refine((value) => !/[<>{}]/.test(value), 'Names cannot contain < > { }');

export const shortText = z.string().trim().max(200);
export const longText = z.string().trim().max(4000);
export const requiredLongText = z.string().trim().min(3, 'Please add a little more detail').max(4000);

export const otpCode = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code');

export const isoDate = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid date')
  .transform((value) => new Date(value));

export const optionalIsoDate = z
  .union([isoDate, z.literal('')])
  .optional()
  .transform((value) => (value === '' ? undefined : value));

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).optional(),
  q: z.string().trim().max(120).optional(),
  sort: z.string().trim().max(40).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export const stringList = z.array(z.string().trim().min(1).max(120)).max(40);

export const enumOf = <T extends readonly [string, ...string[]]>(values: T) => z.enum(values);
