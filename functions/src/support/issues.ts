import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { createHash } from "node:crypto";
import { db, FieldValue, COL } from "../shared/admin.js";
import { getProfile, requireActiveUser, requireRole } from "../shared/auth.js";
import { parseInput } from "../shared/validate.js";
import { enforceRateLimit, RATE } from "../shared/rateLimit.js";
import { recordAuditLog } from "../shared/audit.js";
import { submitIssueReportSchema, listIssueReportsSchema, issueReportIdSchema, resolveIssueReportSchema } from "../shared/schemas.js";

/**
 * "Report a problem" — a single place for ANYONE (guest, member, mod, admin) to
 * tell the team something is broken: a bug, a visual glitch, a page that won't
 * load. It is deliberately NOT a way to flag a user (that's the separate,
 * confidential content/user report flow). Reports land in `issueReports` for the
 * admin console and — when email delivery is enabled — are forwarded to support.
 *
 * Privacy: we store the message, an optional contact email, the client debug
 * snapshot the reporter chose to send, and an optional screenshot they captured.
 * Raw IPs are never stored — only a salted-by-default short hash for abuse
 * correlation. Writes are function-only; the collection is unreadable by clients.
 */

const SUPPORT_EMAIL = "support@thecyclevault.com";

/**
 * When `process.env.ISSUE_REPORT_EMAILS === "on"`, each report is ALSO written to
 * the `mail` collection in the shape the Firebase "Trigger Email" extension
 * consumes, so support@ receives it by email. Read from the ambient environment
 * (mirrors moderation.ts's MODERATION_AI_KEY) so the emulator never prompts for a
 * deploy-time param. Default off so we don't accumulate unsent mail docs (with
 * PII) until the founder installs/configures that extension — reports are always
 * visible in the admin console regardless. Enable with functions env config.
 */
function emailDeliveryEnabled(): boolean {
	return process.env.ISSUE_REPORT_EMAILS === "on";
}

/** Connection IP (never client-spoofable first hop); used only as a short hash. */
function callerIp(request: CallableRequest): string {
	const raw = request.rawRequest;
	const xff = (raw?.headers?.["x-forwarded-for"] as string | undefined) ?? "";
	return (raw?.ip || xff.split(",").map((s) => s.trim()).filter(Boolean).pop() || "unknown").trim();
}
function ipHash(request: CallableRequest): string {
	return createHash("sha256").update(callerIp(request)).digest("hex").slice(0, 24);
}

function tsToMillis(v: unknown): number | null {
	const t = v as { toMillis?: () => number } | null | undefined;
	return t && typeof t.toMillis === "function" ? t.toMillis() : null;
}

/** Queue a support email via the Trigger Email extension's `mail` collection. */
async function queueSupportEmail(
	id: string,
	doc: { message: string; category: string; email: string | null; reporterUsername: string | null; context: string | null },
	screenshot: string | null,
): Promise<void> {
	const from = doc.reporterUsername ? `${doc.reporterUsername}` : "a guest";
	const text = [
		`New issue report (${doc.category}) from ${from}.`,
		"",
		"Message:",
		doc.message,
		"",
		`Contact: ${doc.email ?? "(none provided)"}`,
		"",
		"Technical context:",
		doc.context ?? "(none)",
		"",
		`Report ID: ${id}`,
		"Open the Admin console → Issues to manage this report.",
	].join("\n");

	const message: Record<string, unknown> = {
		subject: `[CycleVault Social] ${doc.category} report from ${from}`,
		text,
	};
	// Attach the screenshot only if it comfortably fits (keep the mail doc < 1 MiB).
	if (screenshot && screenshot.length < 700_000) {
		const m = /^data:(image\/(?:png|jpeg));base64,(.+)$/.exec(screenshot);
		if (m) {
			message.attachments = [
				{ filename: `screenshot.${m[1] === "image/png" ? "png" : "jpg"}`, content: m[2], encoding: "base64", contentType: m[1] },
			];
		}
	}

	const mailDoc: Record<string, unknown> = { to: [SUPPORT_EMAIL], message, createdAt: FieldValue.serverTimestamp() };
	if (doc.email) mailDoc.replyTo = doc.email;
	await db.collection(COL.mail).add(mailDoc);
}

/** submitIssueReport — open to everyone (guests included); rate-limited. */
export const submitIssueReport = onCall(async (request: CallableRequest) => {
	const input = parseInput(submitIssueReportSchema, request.data);
	const uid = request.auth?.uid ?? null;

	// Rate limit: authed callers by uid, guests by hashed IP.
	if (uid) {
		await enforceRateLimit(uid, "issueReport", RATE.issueReport.limit, RATE.issueReport.windowMs);
	} else {
		await enforceRateLimit(`ipguest:${ipHash(request)}`, "issueReportGuest", RATE.issueReportGuest.limit, RATE.issueReportGuest.windowMs);
	}

	// Resolve reporter identity authoritatively (never trust the client for these).
	let reporterUsername: string | null = null;
	let reporterRole: string | null = null;
	if (uid) {
		const profile = await getProfile(uid).catch(() => null);
		reporterUsername = profile?.username ?? null;
		reporterRole = profile?.role ?? null;
	}
	// Contact email: a signed-in reporter's verified token email wins; otherwise
	// fall back to whatever a guest typed (already format-validated by Zod).
	const tokenEmail = (request.auth?.token?.email as string | undefined) ?? null;
	const email = tokenEmail ?? input.email ?? null;
	// `category` carries a Zod default; narrow it to a definite string for the
	// strictly-typed email/audit paths below.
	const category = input.category ?? "other";

	const serverUserAgent = String(request.rawRequest?.headers?.["user-agent"] ?? "").slice(0, 500);

	const doc = {
		message: input.message,
		category,
		email,
		context: input.context ?? null,
		hasScreenshot: !!input.screenshot,
		screenshot: input.screenshot ?? null,
		reporterUid: uid,
		reporterUsername,
		reporterRole,
		reporterIpHash: ipHash(request),
		serverUserAgent,
		status: "open" as const,
		source: "web",
		createdAt: FieldValue.serverTimestamp(),
		updatedAt: FieldValue.serverTimestamp(),
		resolvedAt: null,
		resolvedBy: null,
	};

	const ref = await db.collection(COL.issueReports).add(doc);

	// Optional email hand-off (never blocks the submit if it fails).
	if (emailDeliveryEnabled()) {
		await queueSupportEmail(
			ref.id,
			{ message: input.message, category, email, reporterUsername, context: input.context ?? null },
			input.screenshot ?? null,
		).catch(() => {
			/* delivery is best-effort; the report is safely stored regardless */
		});
	}

	await recordAuditLog({
		actorId: uid,
		event: "issue_report_submitted",
		targetType: "issueReport",
		targetId: ref.id,
		metadata: { category, hasScreenshot: !!input.screenshot },
	});

	return { ok: true as const, id: ref.id };
});

/** listIssueReports — admin-only. Returns metadata WITHOUT the screenshot blobs
 *  (those are fetched on demand) to keep the response small. */
export const listIssueReports = onCall(async (request) => {
	const { profile } = await requireActiveUser(request);
	requireRole(profile, "admin");
	const input = parseInput(listIssueReportsSchema, request.data ?? {});

	const base = db.collection(COL.issueReports);
	const q =
		input.status === "all"
			? base.orderBy("createdAt", "desc").limit(60)
			: base.where("status", "==", input.status).orderBy("createdAt", "desc").limit(60);

	const snap = await q.get();
	const items = snap.docs.map((d) => {
		const data = d.data() as Record<string, unknown>;
		return {
			id: d.id,
			message: String(data.message ?? ""),
			category: String(data.category ?? "other"),
			email: (data.email as string | null) ?? null,
			context: (data.context as string | null) ?? null,
			hasScreenshot: data.hasScreenshot === true,
			reporterUid: (data.reporterUid as string | null) ?? null,
			reporterUsername: (data.reporterUsername as string | null) ?? null,
			reporterRole: (data.reporterRole as string | null) ?? null,
			serverUserAgent: (data.serverUserAgent as string | null) ?? null,
			source: String(data.source ?? "web"),
			status: String(data.status ?? "open"),
			createdAt: tsToMillis(data.createdAt),
			resolvedAt: tsToMillis(data.resolvedAt),
			resolvedBy: (data.resolvedBy as string | null) ?? null,
		};
	});
	return { items };
});

/** getIssueReportScreenshot — admin-only; returns one report's screenshot on
 *  demand so the list endpoint stays lightweight. */
export const getIssueReportScreenshot = onCall(async (request) => {
	const { profile } = await requireActiveUser(request);
	requireRole(profile, "admin");
	const input = parseInput(issueReportIdSchema, request.data);
	const snap = await db.collection(COL.issueReports).doc(input.id).get();
	if (!snap.exists) throw new HttpsError("not-found", "Report not found.");
	const screenshot = (snap.data() as Record<string, unknown>).screenshot as string | null;
	return { screenshot: screenshot ?? null };
});

/** resolveIssueReport — admin-only; mark a report resolved (or reopen it). */
export const resolveIssueReport = onCall(async (request) => {
	const { auth, profile } = await requireActiveUser(request);
	requireRole(profile, "admin");
	const input = parseInput(resolveIssueReportSchema, request.data);

	const ref = db.collection(COL.issueReports).doc(input.id);
	const snap = await ref.get();
	if (!snap.exists) throw new HttpsError("not-found", "Report not found.");

	await ref.update({
		status: input.status,
		resolvedAt: input.status === "resolved" ? FieldValue.serverTimestamp() : null,
		resolvedBy: input.status === "resolved" ? auth.uid : null,
		updatedAt: FieldValue.serverTimestamp(),
	});

	await recordAuditLog({
		actorId: auth.uid,
		event: "issue_report_resolved",
		targetType: "issueReport",
		targetId: input.id,
		metadata: { status: input.status },
	});
	return { ok: true as const };
});
