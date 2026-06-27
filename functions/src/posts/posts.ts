import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, FieldValue, COL } from "../shared/admin.js";
import { requireActiveUser, requireEmailVerified, requireModeratorOf } from "../shared/auth.js";
import { parseInput } from "../shared/validate.js";
import { enforceRateLimit, RATE } from "../shared/rateLimit.js";
import { recordModerationAction } from "../shared/audit.js";
import { hotRank } from "../shared/ranking.js";
import { createPostSchema, updatePostSchema, postIdSchema, lockPostSchema } from "../shared/schemas.js";

/** createPost — server-authoritative create with denormalized author + counters. */
export const createPost = onCall(async (request) => {
	const { auth, profile } = await requireActiveUser(request);
	requireEmailVerified(auth);
	const input = parseInput(createPostSchema, request.data);

	await enforceRateLimit(auth.uid, "createPost", RATE.createPost.limit, RATE.createPost.windowMs);
	await enforceRateLimit(auth.uid, "createPostDaily", RATE.createPostDaily.limit, RATE.createPostDaily.windowMs);

	const communityRef = db.collection(COL.communities).doc(input.communityId);
	const communitySnap = await communityRef.get();
	if (!communitySnap.exists) {
		throw new HttpsError("not-found", "That community does not exist.");
	}

	const now = Date.now();
	const postRef = db.collection(COL.posts).doc();
	const batch = db.batch();
	batch.set(postRef, {
		authorId: auth.uid,
		authorUsername: profile.username,
		communityId: input.communityId,
		title: input.title,
		body: input.body,
		tags: input.tags ?? [],
		score: 0,
		upvoteCount: 0,
		downvoteCount: 0,
		commentCount: 0,
		hotRank: hotRank(0, now),
		status: "active",
		locked: false,
		edited: false,
		createdAt: FieldValue.serverTimestamp(),
		updatedAt: FieldValue.serverTimestamp(),
	});
	batch.update(db.collection(COL.users).doc(auth.uid), {
		postCount: FieldValue.increment(1),
	});
	batch.update(communityRef, { postCount: FieldValue.increment(1) });
	await batch.commit();

	return { postId: postRef.id };
});

/** updatePost — author-only edit of an active post. */
export const updatePost = onCall(async (request) => {
	const { auth } = await requireActiveUser(request);
	const input = parseInput(updatePostSchema, request.data);

	const ref = db.collection(COL.posts).doc(input.postId);
	await db.runTransaction(async (tx) => {
		const snap = await tx.get(ref);
		if (!snap.exists) throw new HttpsError("not-found", "Post not found.");
		const post = snap.data() as Record<string, unknown>;
		if (post.authorId !== auth.uid) {
			throw new HttpsError("permission-denied", "You can only edit your own posts.");
		}
		if (post.status !== "active") {
			throw new HttpsError("failed-precondition", "This post can no longer be edited.");
		}
		const patch: Record<string, unknown> = { edited: true, updatedAt: FieldValue.serverTimestamp() };
		if (input.title !== undefined) patch.title = input.title;
		if (input.body !== undefined) patch.body = input.body;
		if (input.tags !== undefined) patch.tags = input.tags;
		tx.update(ref, patch as FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>);
	});

	return { ok: true as const };
});

/** deletePostSoft — author soft-delete; tombstones content, decrements counters. */
export const deletePostSoft = onCall(async (request) => {
	const { auth } = await requireActiveUser(request);
	const input = parseInput(postIdSchema, request.data);

	const ref = db.collection(COL.posts).doc(input.postId);
	await db.runTransaction(async (tx) => {
		const snap = await tx.get(ref);
		if (!snap.exists) throw new HttpsError("not-found", "Post not found.");
		const post = snap.data() as Record<string, unknown>;
		if (post.authorId !== auth.uid) {
			throw new HttpsError("permission-denied", "You can only delete your own posts.");
		}
		if (post.status === "deleted") return;
		tx.update(ref, {
			status: "deleted",
			title: "[deleted]",
			body: "[deleted]",
			updatedAt: FieldValue.serverTimestamp(),
		});
		tx.update(db.collection(COL.users).doc(auth.uid), { postCount: FieldValue.increment(-1) });
		tx.update(db.collection(COL.communities).doc(String(post.communityId)), {
			postCount: FieldValue.increment(-1),
		});
	});

	return { ok: true as const };
});

/** lockPost — moderator locks/unlocks comments on a post. */
export const lockPost = onCall(async (request) => {
	const { auth, profile } = await requireActiveUser(request);
	const input = parseInput(lockPostSchema, request.data);

	const ref = db.collection(COL.posts).doc(input.postId);
	const snap = await ref.get();
	if (!snap.exists) throw new HttpsError("not-found", "Post not found.");
	const post = snap.data() as Record<string, unknown>;
	requireModeratorOf(profile, String(post.communityId));

	await ref.update({
		locked: input.locked,
		status: input.locked ? "locked" : "active",
		updatedAt: FieldValue.serverTimestamp(),
	});
	await recordModerationAction({
		actorId: auth.uid,
		actionType: "lock_post",
		targetType: "post",
		targetId: input.postId,
		communityId: String(post.communityId),
		reason: input.reason ?? (input.locked ? "Locked" : "Unlocked"),
	});

	return { ok: true as const };
});
