import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "./AuthProvider";
import { emailSchema } from "./validation";
import { BrandWordmark } from "../../components/BrandWordmark";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";

const forgotSchema = z.object({ email: emailSchema });
type ForgotValues = z.infer<typeof forgotSchema>;

/**
 * Dedicated "reset your password" screen. Its own page (routed from the sign-in
 * form) so the flow is unambiguous: enter your email, get a link. The server is
 * enumeration-safe — it always resolves the same way — so we always show the same
 * neutral confirmation regardless of whether the email is registered.
 */
export default function ForgotPasswordPage() {
	const { resetPassword } = useAuth();
	const location = useLocation();
	// Preserve where the user was headed so "Back to sign in" keeps the return path.
	const from = (location.state as { from?: string } | null)?.from;
	const signInState = from ? { state: { from } } : undefined;

	const [sentTo, setSentTo] = useState<string | null>(null);

	const form = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema) });

	const onSubmit = form.handleSubmit(async (values) => {
		try {
			await resetPassword(values.email);
		} catch {
			// Intentionally ignore — never reveal whether an email exists
			// (enumeration protection). Always show the same neutral confirmation.
		}
		setSentTo(values.email);
	});

	return (
		<div className="mx-auto max-w-sm py-6">
			<div className="rounded-2xl border border-line bg-surface p-6 shadow-soft sm:p-8">
				<div className="mb-6 text-center">
					<BrandWordmark className="text-lg" />
					<h1 className="mt-4 text-xl font-semibold text-ink">Reset your password</h1>
					<p className="mt-1 text-sm text-muted">
						{sentTo ? "Check your inbox for the next step." : "Enter your email and we’ll send you a link to set a new password."}
					</p>
				</div>

				{sentTo ? (
					<div className="space-y-5">
						<div className="rounded-xl border border-lav-soft bg-lav-wash px-4 py-3 text-sm text-ink-2">
							If an account exists for <span className="font-medium text-ink">{sentTo}</span>, a reset link is on its way. It can take a
							few minutes — remember to check your spam folder.
						</div>
						<Button
							type="button"
							variant="ghost"
							className="w-full"
							onClick={() => {
								setSentTo(null);
								form.reset();
							}}>
							Use a different email
						</Button>
						<p className="text-center text-sm text-muted">
							<Link to="/login" {...signInState} className="font-medium text-coral hover:underline">
								Back to sign in
							</Link>
						</p>
					</div>
				) : (
					<form onSubmit={onSubmit} className="space-y-4" noValidate>
						<TextField
							label="Email"
							type="email"
							autoComplete="email"
							autoFocus
							hint="The email you use to sign in."
							{...form.register("email")}
							error={form.formState.errors.email?.message}
						/>
						<Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
							Send reset link
						</Button>
						<p className="text-center text-sm text-muted">
							Remembered it?{" "}
							<Link to="/login" {...signInState} className="font-medium text-coral hover:underline">
								Back to sign in
							</Link>
						</p>
					</form>
				)}
			</div>
		</div>
	);
}
