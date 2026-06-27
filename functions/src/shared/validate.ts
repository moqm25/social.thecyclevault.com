import { z } from "zod";
import { HttpsError } from "firebase-functions/v2/https";

/**
 * Parse callable input with a Zod schema. On failure, throw a safe
 * `invalid-argument` error (never leak internals). Source: docs/API_CONTRACT.md §0.
 */
export function parseInput<T>(schema: z.ZodType<T>, data: unknown): T {
	const result = schema.safeParse(data);
	if (!result.success) {
		const first = result.error.issues[0];
		const path = first?.path.join(".") ?? "input";
		throw new HttpsError("invalid-argument", `Invalid ${path}: ${first?.message ?? "bad input"}`);
	}
	return result.data;
}
