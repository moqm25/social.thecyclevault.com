import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { initializeApp, deleteApp, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, type Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, doc, getDoc, type Firestore } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator, httpsCallable, type Functions } from "firebase/functions";
import { initializeApp as initAdmin, getApps as getAdminApps, deleteApp as deleteAdminApp } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";

/**
 * End-to-end test through the full emulator stack (auth + functions + firestore).
 * Validates the server-authoritative path: sign up → createUserProfile →
 * createPost → voteOnPost, asserting score/counters update correctly.
 *
 * The `general` community is seeded by the npm script before vitest runs.
 * Email verification (required to post) is set via the Admin SDK, which connects
 * to the auth emulator through FIREBASE_AUTH_EMULATOR_HOST. Run via: npm run test:e2e.
 */

const PROJECT_ID = "cyclevault-social";
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let fns: Functions;

beforeAll(() => {
	app = initializeApp({ projectId: PROJECT_ID, apiKey: "fake-api-key" });
	auth = getAuth(app);
	db = getFirestore(app);
	fns = getFunctions(app, "us-central1");
	connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
	connectFirestoreEmulator(db, "127.0.0.1", 8080);
	connectFunctionsEmulator(fns, "127.0.0.1", 5001);
	if (getAdminApps().length === 0) initAdmin({ projectId: PROJECT_ID });
});

afterAll(async () => {
	await deleteApp(app);
	await Promise.all(getAdminApps().map((a) => deleteAdminApp(a)));
});

describe("E2E: full happy path", () => {
	it("signup → profile → post → vote updates score and counters", async () => {
		const email = `e2e_${Date.now()}@example.com`;
		const cred = await createUserWithEmailAndPassword(auth, email, "password123");
		const uid = cred.user.uid;

		// Mark email verified (posting requires it) and refresh the client token so
		// the new email_verified claim is present on the callable's auth context.
		await getAdminAuth().updateUser(uid, { emailVerified: true });
		await cred.user.getIdToken(true);

		// Create pseudonymous profile (reserves username transactionally).
		const username = `e2e${Date.now().toString().slice(-7)}`;
		const createProfile = httpsCallable(fns, "createUserProfile");
		const profileRes = await createProfile({ username, acceptedTermsVersion: "2026-06-26" });
		expect((profileRes.data as { uid: string }).uid).toBe(uid);

		// Create a post in the seeded `general` community.
		const createPost = httpsCallable<unknown, { postId: string }>(fns, "createPost");
		const postRes = await createPost({
			communityId: "general",
			title: "My first post",
			body: "Hello, calm community.",
		});
		const postId = postRes.data.postId;
		expect(postId).toBeTruthy();

		// Post should exist, active, score 0, author denormalized.
		const postSnap = await getDoc(doc(db, "posts", postId));
		expect(postSnap.exists()).toBe(true);
		expect(postSnap.data()?.status).toBe("active");
		expect(postSnap.data()?.score).toBe(0);
		expect(postSnap.data()?.authorUsername).toBe(username);

		// Author postCount incremented to 1.
		const userSnap = await getDoc(doc(db, "users", uid));
		expect(userSnap.data()?.postCount).toBe(1);

		// Upvote the post → score becomes 1.
		const voteOnPost = httpsCallable<unknown, { score: number }>(fns, "voteOnPost");
		const voteRes = await voteOnPost({ postId, value: 1 });
		expect(voteRes.data.score).toBe(1);

		const afterVote = await getDoc(doc(db, "posts", postId));
		expect(afterVote.data()?.score).toBe(1);
		expect(afterVote.data()?.upvoteCount).toBe(1);

		// Re-voting the same way is idempotent (still 1).
		const voteAgain = await voteOnPost({ postId, value: 1 });
		expect(voteAgain.data.score).toBe(1);

		// Removing the vote → score back to 0.
		const unvote = await voteOnPost({ postId, value: 0 });
		expect(unvote.data.score).toBe(0);
	});

	it("rejects unauthenticated profile creation", async () => {
		await auth.signOut();
		const createProfile = httpsCallable(fns, "createUserProfile");
		await expect(createProfile({ username: "nobody", acceptedTermsVersion: "2026-06-26" })).rejects.toMatchObject({
			code: "functions/unauthenticated",
		});
	});
});
