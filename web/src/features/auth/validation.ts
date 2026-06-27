import { z } from 'zod';

/**
 * Auth validation schemas. The username rule mirrors the server contract
 * (docs/API_CONTRACT.md §1: 3–20 chars, [a-zA-Z0-9_]). The server re-validates;
 * these give fast, friendly client feedback.
 */
export const usernameSchema = z
  .string()
  .min(3, 'At least 3 characters')
  .max(20, 'At most 20 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, and underscores only');

export const emailSchema = z.string().email('Enter a valid email');

export const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .max(128, 'Too long');

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password'),
});

export const signUpSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
