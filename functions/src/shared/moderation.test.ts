import { describe, it, expect } from "vitest";
import { analyzeContent, isClean, assessSafety, moderateNewContent } from "./moderation.js";

describe("analyzeContent (Tier 1)", () => {
	it("passes calm, on-topic health content", () => {
		const r = analyzeContent("Cycle length question", "My cycle varies by a few days each month. Is that normal?");
		expect(r.severity).toBe("none");
		expect(r.flags).toHaveLength(0);
		expect(isClean(r)).toBe(true);
	});

	it("flags self-harm with high severity", () => {
		const r = analyzeContent("", "I feel like I want to die and can't go on.");
		expect(r.flags).toContain("self_harm");
		expect(r.severity).toBe("high");
		expect(isClean(r)).toBe(false);
	});

	it("flags spam / solicitation", () => {
		const r = analyzeContent("Make money", "Buy now! Click here for a discount code, DM me on telegram @seller");
		expect(r.flags).toContain("spam");
		expect(isClean(r)).toBe(false);
	});

	it("flags excessive links and contact info", () => {
		const r = analyzeContent("check", "visit http://a.com http://b.com http://c.com or email me@x.com");
		expect(r.flags).toContain("excessive_links");
		expect(r.flags).toContain("contact_info");
		expect(isClean(r)).toBe(false);
	});

	it("flags medical misinformation patterns", () => {
		const r = analyzeContent("", "This miracle cure will cure cancer — stop taking your meds.");
		expect(r.flags).toContain("medical_misinfo");
		expect(r.severity).toBe("high");
	});
});

describe("assessSafety (Tier 2)", () => {
	it("auto-approves mildly-flagged content (>=0.9 safe)", async () => {
		const t1 = analyzeContent("hello", "great post, see http://example.com");
		const t2 = await assessSafety("hello", "great post, see http://example.com", t1);
		expect(t2.safeConfidence).toBeGreaterThanOrEqual(0.9);
		expect(t2.decision).toBe("auto");
	});

	it("routes high-severity to a human", async () => {
		const t1 = analyzeContent("", "I want to die.");
		const t2 = await assessSafety("", "I want to die.", t1);
		expect(t2.decision).toBe("human");
		expect(t2.safeConfidence).toBeLessThan(0.9);
	});
});

describe("moderateNewContent", () => {
	it("publishes clean content immediately", async () => {
		const m = await moderateNewContent("Question", "What does a follicular phase feel like?");
		expect(m.status).toBe("active");
		expect(m.state).toBe("auto_approved");
	});

	it("holds clearly harmful content for review", async () => {
		const m = await moderateNewContent("", "Buy now, click here, crypto casino, dm me @seller, http://a.com http://b.com http://c.com");
		expect(m.status).toBe("pending");
		expect(m.state).toBe("awaiting_human");
	});
});
