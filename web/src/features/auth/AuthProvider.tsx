import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
	onAuthStateChanged,
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
	signOut as fbSignOut,
	sendEmailVerification,
	type User,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
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
				if (auth.currentUser) await sendEmailVerification(auth.currentUser);
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
