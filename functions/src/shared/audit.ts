import { db, FieldValue, COL } from "./admin.js";

/**
 * Append a moderation action (always) and optionally a security audit-log entry.
 * Both collections are append-only (docs/MODERATION_PLAN.md §5). No IP is ever
 * stored.
 */
export async function recordModerationAction(input: {
	actorId: string;
	actionType: string;
	targetType: "post" | "comment" | "user";
	targetId: string;
	communityId?: string | null;
	reason: string;
	relatedReportId?: string | null;
	metadata?: Record<string, unknown>;
}): Promise<void> {
	await db.collection(COL.moderationActions).add({
		...input,
		communityId: input.communityId ?? null,
		relatedReportId: input.relatedReportId ?? null,
		metadata: input.metadata ?? {},
		createdAt: FieldValue.serverTimestamp(),
	});
}

export async function recordAuditLog(input: {
	actorId?: string | null;
	event: string;
	targetType?: string | null;
	targetId?: string | null;
	metadata?: Record<string, unknown>;
}): Promise<void> {
	await db.collection(COL.auditLogs).add({
		actorId: input.actorId ?? null,
		event: input.event,
		targetType: input.targetType ?? null,
		targetId: input.targetId ?? null,
		metadata: input.metadata ?? {},
		createdAt: FieldValue.serverTimestamp(),
	});
}
