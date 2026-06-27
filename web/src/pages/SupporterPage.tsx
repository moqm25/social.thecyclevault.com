import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";
import { UserBadges } from "../components/Badge";
import { SignInLink } from "../components/SignInLink";

const PERKS = [
	"Remove ads — a calm, ad-free community",
	"Supporter badge on your profile",
	"Profile accent themes (Coral · Sage · Ocean · Plum)",
	"Create polls (and larger image uploads, later)",
	"Higher rate limits + early access to new features",
	"“Founding Supporter” recognition for early members",
];

const PLANS = [
	{ name: "Monthly", price: "$2.99", per: "/mo" },
	{ name: "Annual", price: "$19.99", per: "/yr", note: "≈ 44% off", best: true },
	{ name: "Lifetime", price: "$49.99", per: "once", note: "early-adopter" },
];

/**
 * Supporter upgrade page (docs/MONETIZATION.md). Payment wiring (Stripe +
 * grantSupporter Cloud Function) is deferred — for now this presents the offer
 * and collects interest. Supporters see a thank-you state instead.
 */
export default function SupporterPage() {
	const { user, profile } = useAuth();

	if (profile?.supporter) {
		return (
			<div className="mx-auto max-w-xl py-10 text-center">
				<div className="mb-3 flex justify-center">
					<UserBadges supporter max={1} />
				</div>
				<h1 className="text-2xl font-semibold text-ink">You’re a Supporter ✦</h1>
				<p className="mt-2 text-muted">
					Thank you for keeping The CycleVault Social calm, private, and ad-free. It genuinely sustains the platform.
				</p>
				<Link to="/" className="mt-5 inline-block font-medium text-coral hover:underline">
					Back to the community
				</Link>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-2xl space-y-8">
			<section className="rounded-2xl border border-line bg-surface p-6 text-center shadow-soft sm:p-8">
				<p className="text-sm font-medium uppercase tracking-wide text-lav">Supporter</p>
				<h1 className="mt-2 text-2xl font-semibold leading-tight text-ink sm:text-3xl">
					Keep it <span className="brand-serif text-coral">calm and ad-free</span>.
				</h1>
				<p className="mx-auto mt-3 max-w-prose text-muted">
					The CycleVault Social is free and always will be. If it’s useful to you, becoming a Supporter removes ads and keeps the community
					running — no data sales, no trackers, no exceptions.
				</p>
			</section>

			<section>
				<h2 className="mb-3 text-lg font-semibold text-ink">What you get</h2>
				<ul className="grid gap-2 sm:grid-cols-2">
					{PERKS.map((p) => (
						<li key={p} className="flex items-start gap-2 rounded-xl border border-line bg-surface p-3 text-sm text-ink-2">
							<span className="mt-0.5 text-coral" aria-hidden="true">
								✓
							</span>
							{p}
						</li>
					))}
				</ul>
			</section>

			<section>
				<h2 className="mb-3 text-lg font-semibold text-ink">Choose a plan</h2>
				<div className="grid gap-3 sm:grid-cols-3">
					{PLANS.map((pl) => (
						<div
							key={pl.name}
							className={`rounded-2xl border p-5 text-center ${pl.best ? "border-coral bg-coral-wash" : "border-line bg-surface"}`}>
							<p className="text-sm font-medium text-muted">{pl.name}</p>
							<p className="mt-1 text-2xl font-semibold text-ink">{pl.price}</p>
							<p className="text-xs text-muted">{pl.per}</p>
							{pl.note && <p className="mt-1 text-xs font-medium text-coral">{pl.note}</p>}
						</div>
					))}
				</div>
				<div className="mt-5 text-center">
					<button
						disabled
						className="cursor-not-allowed rounded-full bg-coral px-6 py-2.5 font-medium text-white opacity-70"
						title="Coming soon">
						Coming soon
					</button>
					<p className="mt-2 text-sm text-muted">
						Payments are being set up.{" "}
						{user ? (
							"We’ll let you know the moment Supporter goes live."
						) : (
							<>
								<SignInLink className="font-medium text-coral hover:underline">Sign in</SignInLink> to be first in line.
							</>
						)}
					</p>
				</div>
			</section>

			<p className="text-center text-xs text-muted">
				App Supporters will get forum Supporter included. No ads are ever behavioral; we never sell your data.
			</p>
		</div>
	);
}
