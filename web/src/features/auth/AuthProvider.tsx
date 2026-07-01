import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
	onAuthStateChanged,
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
	signOut as fbSignOut,
	reauthenticateWithCredential,
	updatePassword,
	EmailAuthProvider,
	type User,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { sendBrandedPasswordReset, sendBrandedVerificationEmail } from "../../lib/api";
import type { UserProfile } from "../../types/models";

interface AuthContextValue {
	/** Firebase Auth user (identity). Null = signed out. */
	user: User | null;
	/** Firestore profile (pseudonymous). Null until createUserProfile has run. */
	profile: UserProfile | null;
	/** True until the initial auth state is known. */
	loading: boolean;
	signIn: (email: string, password: string) => Promise<void>;
	signUp: (email: string, password: string) => Promise<User>;
	signOutUser: () => Promise<void>;
	sendVerification: () => Promise<void>;
	resetPassword: (email: string) => Promise<void>;
	/** Change the signed-in user's password (re-authenticates with the current one first). */
	changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [profile, setProfile] = useState<UserProfile | null>(null);
	const [loading, setLoading] = useState(true);

	// Track identity.
	useEffect(() => {
		return onAuthStateChanged(auth, (u) => {
			setUser(u);
			setLoading(false);
			if (!u) setProfile(null);
		});
	}, []);

	// Track the pseudonymous profile doc while signed in.
	useEffect(() => {
		if (!user) return;
		const ref = doc(db, "users", user.uid);
		return onSnapshot(
			ref,
			(snap) => setProfile(snap.exists() ? (snap.data() as UserProfile) : null),
			() => setProfile(null),
		);
	}, [user]);

	const value = useMemo<AuthContextValue>(
		() => ({
			user,
			profile,
			loading,
			signIn: async (email, password) => {
				await signInWithEmailAndPassword(auth, email, password);
			},
			signUp: async (email, password) => {
				const cred = await createUserWithEmailAndPassword(auth, email, password);
				return cred.user;
			},
			signOutUser: async () => {
				await fbSignOut(auth);
			},
			sendVerification: async () => {
				// Branded verification email via our SendGrid pipeline (Firebase's built-in
				// template body is locked by Google). devLink is returned only on the emulator.
				const res = await sendBrandedVerificationEmail({});
				if (res.devLink) console.info(`[The CycleVault Social] (emulator) verification link:\n${res.devLink}`);
			},
			resetPassword: async (email) => {
				// Branded reset email via our SendGrid pipeline. The server never reveals
				// whether the account exists (email-enumeration protection) — it always
				// resolves ok. devLink is returned only when running against the emulator.
				const res = await sendBrandedPasswordReset({ email });
				if (res.devLink) console.info(`[The CycleVault Social] (emulator) password-reset link for ${email}:\n${res.devLink}`);
			},
			changePassword: async (currentPassword, newPassword) => {
				const u = auth.currentUser;
				if (!u || !u.email) throw new Error("auth/no-current-user");
				// Re-authenticate first: updatePassword requires a recent login, and this
				// also confirms the current password is correct before we change it.
				const cred = EmailAuthProvider.credential(u.email, currentPassword);
				await reauthenticateWithCredential(u, cred);
				await updatePassword(u, newPassword);
			},
		}),
		[user, profile, loading],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
}
