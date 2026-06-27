import { z } from "zod";

/**
 * Auth validation schemas. The username rule mirrors the server contract
 * (docs/API_CONTRACT.md §1: 3–20 chars, [a-zA-Z0-9_]). The server re-validates;
 * these give fast, friendly client feedback.
 */
export const usernameSchema = z
	.string()
	.min(3, "At least 3 characters")
	.max(20, "At most 20 characters")
	.regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, and underscores only");

export const emailSchema = z.string().email("Enter a valid email");

// A small set of obviously weak passwords to reject outright. Not exhaustive —
// real protection is length + Firebase's own hashing (scrypt) and rate limits.
const COMMON_PASSWORDS = new Set([
	"password",
	"password1",
	"password123",
	"12345678",
	"123456789",
	"qwerty123",
	"11111111",
	"iloveyou",
	"letmein1",
	"abc12345",
]);

export const passwordSchema = z
	.string()
	.min(8, "Use at least 8 characters")
	.max(128, "That's too long")
	.regex(/[A-Za-z]/, "Include at least one letter")
	.regex(/[0-9]/, "Include at least one number")
	.refine((p) => !COMMON_PASSWORDS.has(p.toLowerCase()), "That password is too common");

export const signInSchema = z.object({
	email: emailSchema,
	password: z.string().min(1, "Enter your password"),
});

export const signUpSchema = z.object({
	username: usernameSchema,
	email: emailSchema,
	password: passwordSchema,
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
