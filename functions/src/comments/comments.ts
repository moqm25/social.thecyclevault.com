import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, FieldValue, COL } from "../shared/admin.js";
import { requireActiveUser, requireEmailVerified } from "../shared/auth.js";
import { parseInput } from "../shared/validate.js";
import { enforceRateLimit, RATE } from "../shared/rateLimit.js";
import { createNotification } from "../shared/notify.js";
import { moderateNewContent } from "../shared/moderation.js";
import { enqueueModeration } from "../shared/moderationQueue.js";
import { createCommentSchema, updateCommentSchema, commentIdSchema } from "../shared/schemas.js";

const MAX_DEPTH = 6;

/** createComment — adds a comment, bumps counters, notifies the parent author. */
export const createComment = onCall(async (request) => {
	const { auth, profile } = await requireActiveUser(request);
	requireEmailVerified(auth);
	const input = parseInput(createCommentSchema, request.data);
	await enforceRateLimit(auth.uid, "createComment", RATE.createComment.limit, RATE.createComment.windowMs);

	// Moderation pipeline (docs/MODERATION_AI.md). Run before the transaction.
	const mod = await moderateNewContent("", input.body);

	const postRef = db.collection(COL.posts).doc(input.postId);
	const commentRef = db.collection(COL.comments).doc();

	const result = await db.runTransaction(async (tx) => {
		const postSnap = await tx.get(postRef);
		if (!postSnap.exists) throw new HttpsError("not-found", "Post not found.");
		const post = postSnap.data() as Record<string, unknown>;
		if (post.status !== "active") {
			throw new HttpsError("failed-precondition", "This post is closed to new comments.");
		}
		if (post.locked === true) {
			throw new HttpsError("failed-precondition", "This post is locked.");
		}

		let depth = 0;
		let parentRef = null;
		let recipientId: string;
		let type: "post_reply" | "comment_reply";
		if (input.parentCommentId) {
			parentRef = db.collection(COL.comments).doc(input.parentCommentId);
			const parentSnap = await tx.get(parentRef);
			if (!parentSnap.exists) throw new HttpsError("not-found", "Parent comment not found.");
			const parent = parentSnap.data() as Record<string, unknown>;
			depth = Math.min(((parent.depth as number) ?? 0) + 1, MAX_DEPTH);
			recipientId = String(parent.authorId);
			type = "comment_reply";
		} else {
			recipientId = String(post.authorId);
			type = "post_reply";
		}

		tx.set(commentRef, {
			postId: input.postId,
			parentCommentId: input.parentCommentId ?? null,
			communityId: post.communityId,
			authorId: auth.uid,
			authorUsername: profile.username,
			// Denormalized author flair snapshot (badges render with zero extra reads).
			authorBadges: profile.badges,
			authorSupporter: profile.supporter,
			body: input.body,
			depth,
			score: 0,
			upvoteCount: 0,
			downvoteCount: 0,
			replyCount: 0,
			status: mod.status,
			moderation: {
				state: mod.state,
				score: mod.tier1.score,
				severity: mod.tier1.severity,
				flags: mod.tier1.flags,
				safeConfidence: mod.tier2?.safeConfidence ?? null,
			},
			edited: false,
			createdAt: FieldValue.serverTimestamp(),
			updatedAt: FieldValue.serverTimestamp(),
		});
		tx.update(postRef, { commentCount: FieldValue.increment(1) });
		tx.update(db.collection(COL.users).doc(auth.uid), { commentCount: FieldValue.increment(1) });
		if (parentRef) tx.update(parentRef, { replyCount: FieldValue.increment(1) });

		return {
			recipientId,
			type,
			communityId: String(post.communityId),
			link: `/post/${input.postId}#c-${commentRef.id}`,
		};
	});

	// Full audit stream.
	await enqueueModeration({
		contentType: "comment",
		contentId: commentRef.id,
		communityId: result.communityId,
		postId: input.postId,
		authorId: auth.uid,
		authorUsername: profile.username,
		excerpt: input.body,
		state: mod.state,
		tier1: mod.tier1,
		tier2: mod.tier2,
		decidedBy: mod.decidedBy,
	});

	if (mod.status === "active") {
		// Only notify the parent author once the comment is actually visible.
		await createNotification({
			recipientId: result.recipientId,
			type: result.type,
			title: result.type === "comment_reply" ? "New reply" : "New comment on your post",
			body: `${profile.username} replied: ${input.body.slice(0, 80)}`,
			link: result.link,
			actorId: auth.uid,
			actorUsername: profile.username,
		});
	} else {
		// Held: tell the author, don't notify the parent yet.
		await createNotification({
			recipientId: auth.uid,
			type: "mod_action",
			title: "Your comment is being reviewed",
			body: "Just a quick check before it goes live — a moderator will review it shortly.",
			link: `/post/${input.postId}`,
		});
	}

	return { commentId: commentRef.id, status: mod.status };
});

/** updateComment — author-only edit of an active comment. */
export const updateComment = onCall(async (request) => {
	const { auth } = await requireActiveUser(request);
	const input = parseInput(updateCommentSchema, request.data);

	const ref = db.collection(COL.comments).doc(input.commentId);
	await db.runTransaction(async (tx) => {
		const snap = await tx.get(ref);
		if (!snap.exists) throw new HttpsError("not-found", "Comment not found.");
		const comment = snap.data() as Record<string, unknown>;
		if (comment.authorId !== auth.uid) {
			throw new HttpsError("permission-denied", "You can only edit your own comments.");
		}
		if (comment.status !== "active") {
			throw new HttpsError("failed-precondition", "This comment can no longer be edited.");
		}
		tx.update(ref, { body: input.body, edited: true, updatedAt: FieldValue.serverTimestamp() });
	});

	return { ok: true as const };
});

/** deleteCommentSoft — author soft-delete; tombstones body, decrements counters. */
export const deleteCommentSoft = onCall(async (request) => {
	const { auth } = await requireActiveUser(request);
	const input = parseInput(commentIdSchema, request.data);

	const ref = db.collection(COL.comments).doc(input.commentId);
	await db.runTransaction(async (tx) => {
		const snap = await tx.get(ref);
		if (!snap.exists) throw new HttpsError("not-found", "Comment not found.");
		const comment = snap.data() as Record<string, unknown>;
		if (comment.authorId !== auth.uid) {
			throw new HttpsError("permission-denied", "You can only delete your own comments.");
		}
		if (comment.status === "deleted") return;
		tx.update(ref, {
			status: "deleted",
			body: "[deleted]",
			updatedAt: FieldValue.serverTimestamp(),
		});
		tx.update(db.collection(COL.posts).doc(String(comment.postId)), {
			commentCount: FieldValue.increment(-1),
		});
		tx.update(db.collection(COL.users).doc(auth.uid), { commentCount: FieldValue.increment(-1) });
	});

	return { ok: true as const };
});
