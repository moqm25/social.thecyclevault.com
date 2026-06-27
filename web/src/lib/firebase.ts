import { initializeApp, type FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFirestore, initializeFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
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

/**
 * App Check (reCAPTCHA v3) — proves requests come from our genuine app, blunting
 * scripted abuse against callables and Firestore. Activated only when a site key
 * is configured (so local/dev is unaffected). Enforcement is toggled per-service
 * in the Firebase console as a go-live step (see DEPLOYMENT_PLAN §6).
 */
if (env.VITE_RECAPTCHA_SITE_KEY && !useEmulators) {
	initializeAppCheck(app, {
		provider: new ReCaptchaV3Provider(env.VITE_RECAPTCHA_SITE_KEY),
		isTokenAutoRefreshEnabled: true,
	});
}

export const auth: Auth = getAuth(app);
export const db: Firestore = useEmulators
	? // The default streaming Listen transport gets aborted by the integrated
	  // (automated) browser against the emulator, dropping realtime listeners into
	  // offline mode. Long-polling is robust against that. Emulator-only; production
	  // keeps the default transport (HTTP/2 multiplexes, so this isn't needed there).
	  initializeFirestore(app, { experimentalForceLongPolling: true })
	: getFirestore(app);
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
