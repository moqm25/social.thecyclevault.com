/**
 * Pure vote arithmetic — extracted so it can be unit-tested without Firestore.
 * `prev` and `next` are the user's previous and new vote values (-1, 0, or 1).
 */
export interface VoteDeltas {
  scoreDelta: number;
  upDelta: number;
  downDelta: number;
}

export function computeVoteDeltas(prev: -1 | 0 | 1, next: -1 | 0 | 1): VoteDeltas {
  return {
    scoreDelta: next - prev,
    upDelta: (next === 1 ? 1 : 0) - (prev === 1 ? 1 : 0),
    downDelta: (next === -1 ? 1 : 0) - (prev === -1 ? 1 : 0),
  };
}
