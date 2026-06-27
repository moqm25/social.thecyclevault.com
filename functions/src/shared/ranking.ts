/**
 * Reddit-style "hot" ranking with time decay. Computed in the vote transaction
 * and stored as `hotRank` so feeds sort without per-read computation.
 * Source: docs/DATA_MODEL.md §15.
 */
const EPOCH = 1_700_000_000; // fixed reference epoch (seconds)

export function hotRank(score: number, createdAtMs: number): number {
	const sign = score > 0 ? 1 : score < 0 ? -1 : 0;
	const order = Math.log10(Math.max(Math.abs(score), 1));
	const seconds = Math.floor(createdAtMs / 1000) - EPOCH;
	return Math.round((sign * order + seconds / 45000) * 1e7) / 1e7;
}
