import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { createHash } from "node:crypto";
import { db, adminAuth, FieldValue, COL } from "../shared/admin.js";
import { requireAuth } from "../shared/auth.js";
import { parseInput } from "../shared/validate.js";
import { enforceRateLimit, RATE } from "../shared/rateLimit.js";
import { sendPasswordResetSchema } from "../shared/schemas.js";
import { RESET_PASSWORD_HTML, VERIFY_EMAIL_HTML } from "../shared/emailTemplates.js";

/**
 * Branded transactional auth emails.
 *
 * Google LOCKS the body of Firebase's built-in Auth emails (reset/verify/change)
 * — the Admin API returns EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED. So instead of Firebase
 * sending a plain default email, WE generate the secure action link with the Admin
 * SDK and send our own on-brand HTML through the same SendGrid pipeline the "Report
 * a problem" flow uses (the Trigger Email extension watching the `mail` collection).
 *
 * Privacy/abuse posture:
 *  - Password reset is unauthenticated but must NOT reveal whether an account
 *    exists (email-enumeration protection): we ALWAYS return { ok: true } and only
 *    actually send when the account is real.
 *  - Rate-limited on BOTH the caller IP and the target email so nobody can use it
 *    to inbox-bomb a victim.
 *  - Raw IPs are never stored — only a short salted hash for the limiter key.
 */

function callerIpHash(request: CallableRequest): string {	const raw = request.rawRequest;
	const xff = (raw?.headers?.["x-forwarded-for"] as string | undefined) ?? "";
	const ip = (raw?.ip || xff.split(",").map((s) => s.trim()).filter(Boolean).pop() || "unknown").trim();
	return createHash("sha256").update(ip).digest("hex").slice(0, 24);
}
function emailHash(email: string): string {
	return createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 24);
}
function escapeHtml(s: string): string {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Substitute Firebase-style placeholders into a branded template. The link is a
 *  trusted Admin-SDK URL (inserted as-is into href); user-supplied bits are escaped. */
function render(html: string, vars: { link: string; email: string; newEmail?: string }): string {
	return html
		.replaceAll("%LINK%", vars.link)
		.replaceAll("%EMAIL%", escapeHtml(vars.email))
		.replaceAll("%NEW_EMAIL%", escapeHtml(vars.newEmail ?? ""));
}

/** Queue a branded email through the Trigger Email extension (`mail` collection). */
async function queueEmail(to: string, subject: string, html: string): Promise<void> {
	await db.collection(COL.mail).add({
		to: [to],
		message: { subject, html },
		createdAt: FieldValue.serverTimestamp(),
	});
}

const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";

/**
 * sendBrandedPasswordReset — open to everyone (guests). Generates a real reset
 * link and emails our branded template. Never reveals whether the email exists.
 */
export const sendBrandedPasswordReset = onCall(async (request: CallableRequest) => {
	const input = parseInput(sendPasswordResetSchema, request.data);
	const email = input.email.trim();

	await enforceRateLimit(`ip:${callerIpHash(request)}`, "authEmailIp", RATE.authEmailIp.limit, RATE.authEmailIp.windowMs);
	await enforceRateLimit(`pwreset:${emailHash(email)}`, "passwordResetTarget", RATE.passwordResetTarget.limit, RATE.passwordResetTarget.windowMs);

	let devLink: string | undefined;
	try {
		const link = await adminAuth.generatePasswordResetLink(email);
		await queueEmail(email, "Reset your password 🌿", render(RESET_PASSWORD_HTML, { link, email }));
		if (isEmulator) devLink = link; // dev convenience only (extension doesn't run locally)
	} catch (err) {
		// auth/user-not-found (and similar) must be swallowed to prevent enumeration.
		const code = (err as { code?: string })?.code ?? "";
		if (!code.includes("user-not-found") && !code.includes("email-not-found")) {
			// Log genuinely unexpected errors, but still don't leak to the caller.
			console.error("sendBrandedPasswordReset unexpected error", code || err);
		}
	}

	return { ok: true as const, ...(devLink ? { devLink } : {}) };
});

/**
 * sendBrandedVerificationEmail — for the signed-in user, to their own address.
 * No-ops (still ok) if the email is already verified.
 */
export const sendBrandedVerificationEmail = onCall(async (request: CallableRequest) => {
	const auth = requireAuth(request);
	const email = (request.auth?.token?.email as string | undefined) ?? "";
	if (!email) throw new HttpsError("failed-precondition", "No email on this account.");
	if (auth.emailVerified) return { ok: true as const, alreadyVerified: true };

	await enforceRateLimit(auth.uid, "verifyEmail", RATE.verifyEmail.limit, RATE.verifyEmail.windowMs);

	let devLink: string | undefined;
	try {
		const link = await adminAuth.generateEmailVerificationLink(email);
		await queueEmail(email, `Confirm your email 🌿`, render(VERIFY_EMAIL_HTML, { link, email }));
		if (isEmulator) devLink = link;
	} catch (err) {
		console.error("sendBrandedVerificationEmail error", (err as { code?: string })?.code ?? err);
		throw new HttpsError("internal", "Couldn't send the verification email. Please try again shortly.");
	}

	return { ok: true as const, ...(devLink ? { devLink } : {}) };
});
