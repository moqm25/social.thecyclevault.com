import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FirebaseError } from "firebase/app";
import { useAuth } from "./AuthProvider";
import { signInSchema, signUpSchema, type SignInValues, type SignUpValues } from "./validation";
import { createUserProfile } from "../../lib/api";
import { BrandWordmark } from "../../components/BrandWordmark";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";

const TERMS_VERSION = "2026-06-26";

type Mode = "signin" | "signup";

function friendlyAuthError(err: unknown): string {
	if (err instanceof FirebaseError) {
		switch (err.code) {
			case "auth/invalid-credential":
			case "auth/wrong-password":
			case "auth/user-not-found":
				return "That email or password doesn’t look right.";
			case "auth/email-already-in-use":
				return "An account with this email already exists. Try signing in.";
			case "auth/too-many-requests":
				return "Too many attempts. Please wait a moment and try again.";
			case "functions/already-exists":
				return "That username is taken. Try another.";
			default:
				return "Something went wrong. Please try again.";
		}
	}
	return "Something went wrong. Please try again.";
}

export default function LoginPage() {
	const [mode, setMode] = useState<Mode>("signin");
	const [formError, setFormError] = useState<string | null>(null);
	const { signIn, signUp } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const from = (location.state as { from?: string } | null)?.from ?? "/";

	const signInForm = useForm<SignInValues>({ resolver: zodResolver(signInSchema) });
	const signUpForm = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema) });

	const onSignIn = signInForm.handleSubmit(async (values) => {
		setFormError(null);
		try {
			await signIn(values.email, values.password);
			navigate(from, { replace: true });
		} catch (err) {
			setFormError(friendlyAuthError(err));
		}
	});

	const onSignUp = signUpForm.handleSubmit(async (values) => {
		setFormError(null);
		try {
			await signUp(values.email, values.password);
			// Reserve username + create the pseudonymous profile (server-authoritative).
			await createUserProfile({
				username: values.username,
				acceptedTermsVersion: TERMS_VERSION,
			});
			navigate(from, { replace: true });
		} catch (err) {
			setFormError(friendlyAuthError(err));
		}
	});

	return (
		<div className="mx-auto max-w-sm py-6">
			<div className="rounded-2xl border border-line bg-surface p-6 shadow-soft sm:p-8">
				<div className="mb-6 text-center">
					<BrandWordmark className="text-lg" />
					<h1 className="mt-4 text-xl font-semibold text-ink">{mode === "signin" ? "Welcome back" : "Join the community"}</h1>
					<p className="mt-1 text-sm text-muted">
						{mode === "signin" ? "Sign in to post, comment, and vote." : "Pick a username — no real name needed."}
					</p>
				</div>

				{mode === "signin" ? (
					<form onSubmit={onSignIn} className="space-y-4" noValidate>
						<TextField
							label="Email"
							type="email"
							autoComplete="email"
							{...signInForm.register("email")}
							error={signInForm.formState.errors.email?.message}
						/>
						<TextField
							label="Password"
							type="password"
							autoComplete="current-password"
							{...signInForm.register("password")}
							error={signInForm.formState.errors.password?.message}
						/>
						{formError && <p className="text-sm text-coral">{formError}</p>}
						<Button type="submit" className="w-full" loading={signInForm.formState.isSubmitting}>
							Sign in
						</Button>
					</form>
				) : (
					<form onSubmit={onSignUp} className="space-y-4" noValidate>
						<TextField
							label="Username"
							autoComplete="username"
							hint="Letters, numbers, underscores. This is public."
							{...signUpForm.register("username")}
							error={signUpForm.formState.errors.username?.message}
						/>
						<TextField
							label="Email"
							type="email"
							autoComplete="email"
							hint="Used only to sign in. Never shown publicly."
							{...signUpForm.register("email")}
							error={signUpForm.formState.errors.email?.message}
						/>
						<TextField
							label="Password"
							type="password"
							autoComplete="new-password"
							hint="At least 8 characters, with a letter and a number."
							{...signUpForm.register("password")}
							error={signUpForm.formState.errors.password?.message}
						/>
						{formError && <p className="text-sm text-coral">{formError}</p>}
						<Button type="submit" className="w-full" loading={signUpForm.formState.isSubmitting}>
							Create account
						</Button>
					</form>
				)}

				<p className="mt-5 text-center text-sm text-muted">
					{mode === "signin" ? (
						<>
							New here?{" "}
							<button
								type="button"
								onClick={() => {
									setMode("signup");
									setFormError(null);
								}}
								className="font-medium text-coral hover:underline">
								Create an account
							</button>
						</>
					) : (
						<>
							Already have an account?{" "}
							<button
								type="button"
								onClick={() => {
									setMode("signin");
									setFormError(null);
								}}
								className="font-medium text-coral hover:underline">
								Sign in
							</button>
						</>
					)}
				</p>
			</div>

			<p className="mt-4 text-center text-xs text-muted">
				By continuing you agree to our{" "}
				<Link to="/terms" className="underline">
					Terms
				</Link>{" "}
				and{" "}
				<Link to="/privacy" className="underline">
					Privacy Policy
				</Link>
				. This platform does not provide medical advice.
			</p>
		</div>
	);
}
