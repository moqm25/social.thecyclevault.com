import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FirebaseError } from "firebase/app";
import { useQueryClient } from "@tanstack/react-query";
import { TextField } from "../components/TextField";
import { SignInLink } from "../components/SignInLink";
import { Button } from "../components/Button";
import { useAuth } from "../features/auth/AuthProvider";
import { createCommunity } from "../lib/api";

const inputCls =
	"w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink outline-none transition-colors placeholder:text-muted-2 focus:border-lav";

/** Slugify a name into a url-safe handle (lowercase, hyphens, 3–30 chars). */
function slugify(s: string): string {
	return s
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.replace(/-{2,}/g, "-")
		.slice(0, 30);
}

function friendly(err: unknown): string {
	if (err instanceof FirebaseError) {
		if (err.code === "functions/already-exists") return "That address is taken — try another.";
		if (err.code === "functions/failed-precondition") return "Please verify your email before creating a Circle.";
		if (err.code === "functions/resource-exhausted") return "You’ve created a few Circles recently — please try again later.";
		if (err.code === "functions/invalid-argument") return "Please check the name, address, and description.";
	}
	return "Couldn’t create the Circle. Please try again.";
}

/**
 * Create a "Circle" — a member-made community. The creator becomes its moderator
 * (scoped to that Circle only). Guests are nudged to sign in. Calm, minimal form.
 */
export default function CreateCirclePage() {
	const { user, profile } = useAuth();
	const navigate = useNavigate();
	const qc = useQueryClient();

	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [slugTouched, setSlugTouched] = useState(false);
	const [description, setDescription] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (!user) {
		return (
			<div className="mx-auto max-w-md py-16 text-center">
				<h1 className="text-xl font-semibold text-ink">Create a Circle</h1>
				<p className="mt-2 text-muted">
					Circles are member-made spaces for a topic you care about.{" "}
					<SignInLink className="font-medium text-coral hover:underline">Sign in</SignInLink> to create one.
				</p>
			</div>
		);
	}

	const effectiveSlug = slugTouched ? slug : slugify(name);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		const finalSlug = slugify(effectiveSlug);
		if (name.trim().length < 3) return setError("Give your Circle a name (at least 3 characters).");
		if (finalSlug.length < 3) return setError("The address needs at least 3 characters (letters, numbers, hyphens).");
		if (description.trim().length < 10) return setError("Add a short description (at least 10 characters).");

		setSubmitting(true);
		try {
			const { slug: created } = await createCommunity({
				slug: finalSlug,
				name: name.trim(),
				description: description.trim(),
			});
			await qc.invalidateQueries({ queryKey: ["communities"] });
			navigate(`/c/${created}`);
		} catch (err) {
			setError(friendly(err));
			setSubmitting(false);
		}
	}

	const emailUnverified = user && !user.emailVerified;

	return (
		<div className="mx-auto max-w-xl space-y-5 py-2">
			<header>
				<h1 className="font-serif text-2xl font-semibold text-ink">Create a Circle</h1>
				<p className="mt-1 text-sm text-muted">
					A Circle is a calm, member-made space for a topic. You’ll be its first moderator — please keep it kind and on-topic, in line with
					our{" "}
					<Link to="/guidelines" className="font-medium text-coral hover:underline">
						Community Guidelines
					</Link>
					.
				</p>
			</header>

			{emailUnverified && (
				<div className="rounded-xl border border-lav-soft bg-lav-wash px-4 py-3 text-sm text-ink-2">
					Please verify your email first — check your inbox, then refresh.
				</div>
			)}

			<form onSubmit={onSubmit} className="space-y-4">
				<TextField label="Name" value={name} maxLength={40} placeholder="e.g. Cycle & Sleep" onChange={(e) => setName(e.target.value)} />

				<div className="space-y-1.5">
					<label htmlFor="slug" className="block text-sm font-medium text-ink-2">
						Address
					</label>
					<div className="flex items-center gap-1.5">
						<span className="text-sm text-muted">/c/</span>
						<input
							id="slug"
							value={effectiveSlug}
							maxLength={30}
							placeholder="cycle-and-sleep"
							onChange={(e) => {
								setSlugTouched(true);
								setSlug(e.target.value);
							}}
							className={inputCls}
						/>
					</div>
					<p className="text-sm text-muted">Lowercase letters, numbers, and hyphens. This is the Circle’s permanent link.</p>
				</div>

				<div className="space-y-1.5">
					<label htmlFor="desc" className="block text-sm font-medium text-ink-2">
						Description
					</label>
					<textarea
						id="desc"
						value={description}
						rows={3}
						maxLength={300}
						placeholder="What is this Circle for? Who is it for?"
						onChange={(e) => setDescription(e.target.value)}
						className={`${inputCls} resize-y`}
					/>
				</div>

				{error && <p className="text-sm text-coral">{error}</p>}

				<div className="flex items-center gap-3">
					<Button type="submit" loading={submitting} disabled={!!emailUnverified}>
						Create Circle
					</Button>
					<Link to="/" className="text-sm font-medium text-muted hover:text-coral">
						Cancel
					</Link>
				</div>
				<p className="text-xs text-muted-2">Signed in as {profile?.username ?? "you"}.</p>
			</form>
		</div>
	);
}
