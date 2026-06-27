import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, FieldValue, COL } from '../shared/admin.js';
import { requireActiveUser } from '../shared/auth.js';
import { parseInput } from '../shared/validate.js';
import { enforceRateLimit, RATE } from '../shared/rateLimit.js';
import { hotRank } from '../shared/ranking.js';
import { computeVoteDeltas } from '../shared/voteMath.js';
import { voteOnPostSchema, voteOnCommentSchema } from '../shared/schemas.js';

type TargetType = 'post' | 'comment';

/**
 * Core transactional vote handler shared by posts & comments. Enforces one vote
 * per user per target (deterministic vote-doc ID) and keeps score/up|down counts,
 * author karma, and (for posts) hotRank consistent. Source: docs/API_CONTRACT.md §4.
 */
async function applyVote(
  uid: string,
  targetType: TargetType,
  targetId: string,
  value: 1 | -1 | 0,
): Promise<{ score: number; value: 1 | -1 | 0 }> {
  const targetCol = targetType === 'post' ? COL.posts : COL.comments;
  const targetRef = db.collection(targetCol).doc(targetId);
  const voteRef = db.collection(COL.votes).doc(`${uid}_${targetType}_${targetId}`);

  return db.runTransaction(async (tx) => {
    const [targetSnap, voteSnap] = await Promise.all([tx.get(targetRef), tx.get(voteRef)]);
    if (!targetSnap.exists) throw new HttpsError('not-found', 'That content no longer exists.');
    const target = targetSnap.data() as Record<string, unknown>;
    if (target.status === 'removed' || target.status === 'deleted') {
      throw new HttpsError('failed-precondition', 'You cannot vote on removed content.');
    }

    const prev = voteSnap.exists ? ((voteSnap.data()?.value as 1 | -1) ?? 0) : 0;

    // No change → idempotent no-op.
    if (prev === value) {
      return { score: Number(target.score ?? 0), value: prev as 1 | -1 | 0 };
    }

    const { scoreDelta, upDelta, downDelta } = computeVoteDeltas(prev, value);

    const newScore = Number(target.score ?? 0) + scoreDelta;
    const patch: Record<string, unknown> = {
      score: FieldValue.increment(scoreDelta),
      upvoteCount: FieldValue.increment(upDelta),
      downvoteCount: FieldValue.increment(downDelta),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Posts re-rank on score change. Use the stored createdAt (ms) if present.
    if (targetType === 'post') {
      const createdAtMs =
        (target.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? Date.now();
      patch.hotRank = hotRank(newScore, createdAtMs);
    }
    tx.update(targetRef, patch as FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>);

    // Adjust author karma by the same score delta (not for self-votes' integrity —
    // self-voting is allowed but nets the author their own single vote).
    const authorId = target.authorId as string | undefined;
    if (authorId) {
      tx.update(db.collection(COL.users).doc(authorId), {
        karma: FieldValue.increment(scoreDelta),
      });
    }

    if (value === 0) {
      tx.delete(voteRef);
    } else if (voteSnap.exists) {
      tx.update(voteRef, { value, updatedAt: FieldValue.serverTimestamp() });
    } else {
      tx.set(voteRef, {
        uid,
        targetType,
        targetId,
        value,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return { score: newScore, value };
  });
}

export const voteOnPost = onCall(async (request) => {
  const { auth } = await requireActiveUser(request);
  const input = parseInput(voteOnPostSchema, request.data);
  await enforceRateLimit(auth.uid, 'vote', RATE.vote.limit, RATE.vote.windowMs);
  return applyVote(auth.uid, 'post', input.postId, input.value);
});

export const voteOnComment = onCall(async (request) => {
  const { auth } = await requireActiveUser(request);
  const input = parseInput(voteOnCommentSchema, request.data);
  await enforceRateLimit(auth.uid, 'vote', RATE.vote.limit, RATE.vote.windowMs);
  return applyVote(auth.uid, 'comment', input.commentId, input.value);
});
