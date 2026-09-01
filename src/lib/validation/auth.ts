import { z } from 'zod';
import {
  email,
  internationalPhone,
  optionalEmail,
  otpCode,
  password,
  personName,
  phone,
  shortText,
} from './common';
import { CONTACT_CHANNELS, RELATIONSHIPS } from '../constants';

export const registerSchema = z
  .object({
    name: personName,
    email,
    phone: internationalPhone,
    password,
    relationship: z.enum(RELATIONSHIPS),
    city: shortText.optional(),
    country: shortText.default('India'),
    preferredChannel: z.enum(CONTACT_CHANNELS).default('PHONE'),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'Please accept the terms and the privacy notice' }),
    }),
  })
  .strict();

export const loginSchema = z
  .object({
    identifier: z.string().trim().min(3, 'Enter your email or mobile number').max(200),
    password: z.string().min(1, 'Enter your password').max(200),
  })
  .strict();

export const otpRequestSchema = z
  .object({
    phone,
    purpose: z.enum(['LOGIN', 'SIGNUP', 'VERIFY_PHONE']).default('LOGIN'),
  })
  .strict();

export const otpVerifySchema = z
  .object({
    phone,
    code: otpCode,
    purpose: z.enum(['LOGIN', 'SIGNUP', 'VERIFY_PHONE']).default('LOGIN'),
  })
  .strict();

export const forgotPasswordSchema = z.object({ email }).strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10).max(200),
    password,
  })
  .strict();

export const updateProfileSchema = z
  .object({
    name: personName.optional(),
    email: optionalEmail,
    textScale: z.enum(['normal', 'large', 'xlarge']).optional(),
    highContrast: z.boolean().optional(),
    reduceMotion: z.boolean().optional(),
    timezone: shortText.optional(),
  })
  .strict();
