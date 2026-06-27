import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, FieldValue, COL } from "../shared/admin.js";
import { requireAuth } from "../shared/auth.js";
import { parseInput } from "../shared/validate.js";
import { enforceRateLimit, RATE } from "../shared/rateLimit.js";
import { createUserProfileSchema, reserveUsernameSchema } from "../shared/schemas.js";

const RESERVED_USERNAMES = new Set([
	"admin",
	"administrator",
	"mod",
	"moderator",
	"support",
	"help",
	"thecyclevault",
	"cyclevault",
	"system",
	"root",
	"null",
	"undefined",
	"deleted",
	"me",
]);

/**
 * createUserProfile — reserve username + create the pseudonymous profile in one
 * transaction. The username doc-ID collision IS the uniqueness guarantee.
 * Source: docs/API_CONTRACT.md §1, docs/DATA_MODEL.md §2–3.
 */
export const createUserProfile = onCall(async (request) => {
	const auth = requireAuth(request);
	const input = parseInput(createUserProfileSchema, request.data);
	const usernameLower = input.username.toLowerCase();

	if (RESERVED_USERNAMES.has(usernameLower)) {
		throw new HttpsError("already-exists", "That username is not available.");
	}

	const userRef = db.collection(COL.users).doc(auth.uid);
	const nameRef = db.collection(COL.usernames).doc(usernameLower);

	await db.runTransaction(async (tx) => {
		const [userSnap, nameSnap] = await Promise.all([tx.get(userRef), tx.get(nameRef)]);
		if (userSnap.exists) {
			throw new HttpsError("already-exists", "Your profile already exists.");
		}
		if (nameSnap.exists) {
			throw new HttpsError("already-exists", "That username is taken.");
		}

		tx.set(nameRef, {
			uid: auth.uid,
			username: input.username,
			createdAt: FieldValue.serverTimestamp(),
		});

		tx.set(userRef, {
			uid: auth.uid,
			username: input.username,
			usernameLower,
			displayName: input.displayName ?? null,
			avatarUrl: null,
			bio: input.bio ?? "",
			role: "user",
			status: "active",
			karma: 0,
			postCount: 0,
			commentCount: 0,
			moderatorOf: [],
			suspendedUntil: null,
			acceptedTermsVersion: input.acceptedTermsVersion,
			createdAt: FieldValue.serverTimestamp(),
			updatedAt: FieldValue.serverTimestamp(),
		});
	});

	return { uid: auth.uid, username: input.username };
});

/**
 * reserveUsername — availability check (used by signup). Usernames are immutable
 * in MVP, so this mainly powers the live availability field.
 */
export const reserveUsername = onCall(async (request) => {
	const auth = requireAuth(request);
	const input = parseInput(reserveUsernameSchema, request.data);
	await enforceRateLimit(auth.uid, "reserveUsername", RATE.reserveUsername.limit, RATE.reserveUsername.windowMs);

	const usernameLower = input.username.toLowerCase();
	if (RESERVED_USERNAMES.has(usernameLower)) {
		return { available: false };
	}
	const snap = await db.collection(COL.usernames).doc(usernameLower).get();
	return { available: !snap.exists };
});
