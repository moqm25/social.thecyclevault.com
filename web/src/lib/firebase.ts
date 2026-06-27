import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator, type Functions } from "firebase/functions";
import { getStorage, connectStorageEmulator, type FirebaseStorage } from "firebase/storage";
import { env, useEmulators } from "./env";

/**
 * Single Firebase app instance for the whole SPA. We keep the SDK behind this
 * module (and lib/api.ts) so app code depends on our surface, not the SDK —
 * this is the isolation layer from ADR-0001 §4.3 that keeps us migratable.
 */
const firebaseConfig = {
	apiKey: env.VITE_FIREBASE_API_KEY,
	authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: env.VITE_FIREBASE_APP_ID,
};

export const app: FirebaseApp = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const functions: Functions = getFunctions(app, "us-central1");
export const storage: FirebaseStorage = getStorage(app);

// Connect to the Local Emulator Suite during development. Guarded so HMR doesn't
// reconnect repeatedly.
declare global {
	var __TCV_EMULATORS_CONNECTED__: boolean | undefined;
}

if (useEmulators && !globalThis.__TCV_EMULATORS_CONNECTED__) {
	connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
	connectFirestoreEmulator(db, "127.0.0.1", 8080);
	connectFunctionsEmulator(functions, "127.0.0.1", 5001);
	connectStorageEmulator(storage, "127.0.0.1", 9199);
	globalThis.__TCV_EMULATORS_CONNECTED__ = true;
	console.info("[The CycleVault Social] Connected to Firebase emulators.");
}
