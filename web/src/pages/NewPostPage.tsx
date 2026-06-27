import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { FirebaseError } from "firebase/app";
import { z } from "zod";
import { useCommunities } from "../features/posts/hooks";
import { createPost } from "../lib/api";
import { useAuth } from "../features/auth/AuthProvider";
import { TextField } from "../components/TextField";
import { Button } from "../components/Button";

const schema = z.object({
	communityId: z.string().min(1, "Choose a community"),
	title: z.string().min(1, "Add a title").max(300, "Title is too long"),
	body: z.string().max(40_000, "Too long"),
});

function friendly(err: unknown): string {
	if (err instanceof FirebaseError) {
		if (err.code === "functions/failed-precondition") return "Please verify your email before posting.";
		if (err.code === "functions/resource-exhausted") return "You’re posting a lot — take a short break and try again.";
		if (err.code === "functions/not-found") return "That community no longer exists.";
	}
	return "Couldn’t publish your post. Please try again.";
}

/** Composer for a new post. Community can be pre-selected via ?c=slug. */
export default function NewPostPage() {
	const [params] = useSearchParams();
	const communities = useCommunities();
	const { profile } = useAuth();
	const navigate = useNavigate();

	const [communityId, setCommunityId] = useState(params.get("c") ?? "");
	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	const [errors, setErrors] = useState<{ communityId?: string; title?: string; body?: string; form?: string }>({});
	const [submitting, setSubmitting] = useState(false);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setErrors({});
		const parsed = schema.safeParse({ communityId, title, body });
		if (!parsed.success) {
			const f = parsed.error.flatten().fieldErrors;
			setErrors({ communityId: f.communityId?.[0], title: f.title?.[0], body: f.body?.[0] });
			return;
		}
		setSubmitting(true);
		try {
			const res = await createPost(parsed.data);
			navigate(`/post/${res.postId}`);
		} catch (err) {
			setErrors({ form: friendly(err) });
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="mx-auto max-w-2xl">
			<h1 className="mb-4 text-xl font-semibold text-ink">New post</h1>

			<form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-soft" noValidate>
				<div className="space-y-1.5">
					<label htmlFor="community" className="block text-sm font-medium text-ink-2">
						Community
					</label>
					<select
						id="community"
						value={communityId}
						onChange={(e) => setCommunityId(e.target.value)}
						className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink outline-none transition-colors focus:border-lav">
						<option value="">Choose a community…</option>
						{communities.data?.map((c) => (
							<option key={c.slug} value={c.slug}>
								{c.name}
							</option>
						))}
					</select>
					{errors.communityId && <p className="text-sm text-coral">{errors.communityId}</p>}
				</div>

				<TextField
					label="Title"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					maxLength={300}
					error={errors.title}
					placeholder="What would you like to talk about?"
				/>

				<div className="space-y-1.5">
					<label htmlFor="body" className="block text-sm font-medium text-ink-2">
						Body <span className="font-normal text-muted">(optional)</span>
					</label>
					<textarea
						id="body"
						value={body}
						onChange={(e) => setBody(e.target.value)}
						rows={8}
						maxLength={40_000}
						placeholder="Share your thoughts, gently."
						className="w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink outline-none transition-colors placeholder:text-muted-2 focus:border-lav"
					/>
					{errors.body && <p className="text-sm text-coral">{errors.body}</p>}
				</div>

				<p className="rounded-lg bg-bg-2 px-3 py-2 text-xs text-muted">
					This platform does not provide medical advice. Be kind and respect others’ privacy.
				</p>

				{errors.form && <p className="text-sm text-coral">{errors.form}</p>}
				{profile == null && <p className="text-sm text-muted">Finishing your profile setup… if this persists, please reload.</p>}

				<div className="flex items-center gap-3">
					<Button type="submit" loading={submitting}>
						Publish
					</Button>
					<Link to="/" className="text-sm font-medium text-muted hover:text-coral">
						Cancel
					</Link>
				</div>
			</form>
		</div>
	);
}
