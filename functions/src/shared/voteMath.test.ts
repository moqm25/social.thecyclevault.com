import { describe, it, expect } from 'vitest';
import { computeVoteDeltas } from './voteMath.js';

describe('computeVoteDeltas', () => {
  it('none → upvote: +1 score, +1 up', () => {
    expect(computeVoteDeltas(0, 1)).toEqual({ scoreDelta: 1, upDelta: 1, downDelta: 0 });
  });

  it('none → downvote: -1 score, +1 down', () => {
    expect(computeVoteDeltas(0, -1)).toEqual({ scoreDelta: -1, upDelta: 0, downDelta: 1 });
  });

  it('upvote → downvote: -2 score, -1 up, +1 down', () => {
    expect(computeVoteDeltas(1, -1)).toEqual({ scoreDelta: -2, upDelta: -1, downDelta: 1 });
  });

  it('downvote → upvote: +2 score, +1 up, -1 down', () => {
    expect(computeVoteDeltas(-1, 1)).toEqual({ scoreDelta: 2, upDelta: 1, downDelta: -1 });
  });

  it('upvote → none: -1 score, -1 up', () => {
    expect(computeVoteDeltas(1, 0)).toEqual({ scoreDelta: -1, upDelta: -1, downDelta: 0 });
  });

  it('downvote → none: +1 score, -1 down', () => {
    expect(computeVoteDeltas(-1, 0)).toEqual({ scoreDelta: 1, upDelta: 0, downDelta: -1 });
  });

  it('same value is a no-op delta', () => {
    expect(computeVoteDeltas(1, 1)).toEqual({ scoreDelta: 0, upDelta: 0, downDelta: 0 });
  });
});
