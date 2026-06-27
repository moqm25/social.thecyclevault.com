import { describe, it, expect } from "vitest";
import { hotRank } from "./ranking.js";

describe("hotRank", () => {
	const t0 = 1_700_000_000_000; // ms at the reference epoch

	it("returns ~0 for score 0 at the epoch", () => {
		expect(hotRank(0, t0)).toBeCloseTo(0, 5);
	});

	it("higher score ranks higher at the same time", () => {
		expect(hotRank(100, t0)).toBeGreaterThan(hotRank(10, t0));
	});

	it("newer content ranks higher at the same score", () => {
		const later = t0 + 60 * 60 * 1000; // 1 hour later
		expect(hotRank(10, later)).toBeGreaterThan(hotRank(10, t0));
	});

	it("negative scores rank below zero", () => {
		expect(hotRank(-50, t0)).toBeLessThan(hotRank(0, t0));
	});

	it("time advances rank predictably (45000s ≈ +1)", () => {
		const plusWindow = t0 + 45000 * 1000;
		expect(hotRank(0, plusWindow) - hotRank(0, t0)).toBeCloseTo(1, 5);
	});
});
