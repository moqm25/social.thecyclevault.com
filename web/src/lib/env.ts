import { z } from 'zod';

/**
 * Validated public Firebase web config. These VITE_FIREBASE_* values are public
 * client config (safe to ship) — real protection is Security Rules + App Check.
 * We validate at startup so a misconfigured deploy fails loudly, not silently.
 */
const envSchema = z.object({
  VITE_FIREBASE_API_KEY: z.string().min(1),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  VITE_FIREBASE_PROJECT_ID: z.string().min(1),
  VITE_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  VITE_FIREBASE_APP_ID: z.string().min(1),
  VITE_USE_FIREBASE_EMULATORS: z
    .enum(['true', 'false'])
    .optional()
    .default('false'),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  // Surfaced at startup in dev; in prod this means a broken build config.
  console.error('Invalid Firebase env config:', parsed.error.flatten().fieldErrors);
  throw new Error('Missing or invalid VITE_FIREBASE_* environment variables.');
}

export const env = parsed.data;
export const useEmulators = env.VITE_USE_FIREBASE_EMULATORS === 'true';
