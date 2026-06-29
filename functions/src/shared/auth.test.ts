import { describe, it, expect } from "vitest";
import { requireModeratorOf } from "./auth.js";
import type { ProfileSnapshot } from "./auth.js";

/**
 * Guards the moderation authorization rule. A global moderator+ must be able to
 * moderate ANY community; a role=user "circle creator" only their own; everyone
 * else nobody. Regression test for the bug where global mods were 403'd everywhere.
 */
function profile(role: ProfileSnapshot["role"], moderatorOf: string[] = []): ProfileSnapshot {
	return { uid: "u", username: "u", role, status: "active", moderatorOf, badges: [], supporter: false };
}

describe("requireModeratorOf", () => {
	it("global moderator may moderate any community", () => {
		expect(() => requireModeratorOf(profile("moderator"), "any-circle")).not.toThrow();
	});
	it("admin and superadmin may moderate any community", () => {
		expect(() => requireModeratorOf(profile("admin"), "x")).not.toThrow();
		expect(() => requireModeratorOf(profile("superadmin"), "y")).not.toThrow();
	});
	it("circle creator (role=user) may moderate only their own circle", () => {
		expect(() => requireModeratorOf(profile("user", ["mine"]), "mine")).not.toThrow();
		expect(() => requireModeratorOf(profile("user", ["mine"]), "other")).toThrow();
	});
	it("plain user with no scope may moderate nothing", () => {
		expect(() => requireModeratorOf(profile("user"), "any")).toThrow();
	});
});
