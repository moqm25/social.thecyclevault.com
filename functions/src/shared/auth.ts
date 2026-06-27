import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { db, COL } from "./admin.js";

export type UserRole = "user" | "moderator" | "admin" | "superadmin";
export type UserStatus = "active" | "suspended" | "banned" | "deleted";

const ROLE_RANK: Record<UserRole, number> = {
	user: 0,
	moderator: 1,
	admin: 2,
	superadmin: 3,
};

export interface AuthedUser {
	uid: string;
	emailVerified: boolean;
}

/** Require an authenticated caller. */
export function requireAuth(request: CallableRequest): AuthedUser {
	// App Check (defense-in-depth): when ENFORCE_APP_CHECK is set, reject calls
	// that don't carry a verified App Check token (i.e. not from our real app).
	// Centralized here so every callable inherits it. Off by default so local/
	// emulator and pre-key prod are unaffected (see SECURITY_AUDIT.md).
	if (process.env.ENFORCE_APP_CHECK === "true" && !request.app) {
		throw new HttpsError("failed-precondition", "App verification failed. Please reload and try again.");
	}
	const auth = request.auth;
	if (!auth) {
		throw new HttpsError("unauthenticated", "You must be signed in.");
	}
	return {
		uid: auth.uid,
		emailVerified: auth.token.email_verified === true,
	};
}

export interface ProfileSnapshot {
	uid: string;
	username: string;
	role: UserRole;
	status: UserStatus;
	moderatorOf: string[];
	suspendedUntil?: number | null;
}

/** Load the caller's profile doc, or throw if missing. */
export async function getProfile(uid: string): Promise<ProfileSnapshot> {
	const snap = await db.collection(COL.users).doc(uid).get();
	if (!snap.exists) {
		throw new HttpsError("failed-precondition", "Complete your profile first.");
	}
	const d = snap.data() as Record<string, unknown>;
	return {
		uid,
		username: String(d.username ?? ""),
		role: (d.role as UserRole) ?? "user",
		status: (d.status as UserStatus) ?? "active",
		moderatorOf: (d.moderatorOf as string[]) ?? [],
		suspendedUntil: (d.suspendedUntil as number | null) ?? null,
	};
}

/** Require an authenticated, active (not suspended/banned) user with a profile. */
export async function requireActiveUser(request: CallableRequest): Promise<{ auth: AuthedUser; profile: ProfileSnapshot }> {
	const auth = requireAuth(request);
	const profile = await getProfile(auth.uid);

	if (profile.status === "banned" || profile.status === "deleted") {
		throw new HttpsError("permission-denied", "This account cannot perform that action.");
	}
	if (profile.status === "suspended") {
		const until = profile.suspendedUntil ?? 0;
		if (until > Date.now()) {
			throw new HttpsError("permission-denied", "Your account is temporarily suspended.");
		}
	}
	return { auth, profile };
}

/** Require the caller to have a verified email (gates first post/comment). */
export function requireEmailVerified(auth: AuthedUser): void {
	if (!auth.emailVerified) {
		throw new HttpsError("failed-precondition", "Please verify your email first.");
	}
}

/** Require a minimum global role. */
export function requireRole(profile: ProfileSnapshot, minRole: UserRole): void {
	if (ROLE_RANK[profile.role] < ROLE_RANK[minRole]) {
		throw new HttpsError("permission-denied", "You do not have permission for that.");
	}
}

/** A mod is authorized for a community if global admin+ OR mod of that community. */
export function requireModeratorOf(profile: ProfileSnapshot, communityId: string): void {
	if (ROLE_RANK[profile.role] >= ROLE_RANK.admin) return;
	if (profile.role === "moderator" && profile.moderatorOf.includes(communityId)) return;
	throw new HttpsError("permission-denied", "You do not moderate this community.");
}
