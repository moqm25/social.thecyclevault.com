import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";
import { useCommunities } from "../features/posts/hooks";
import { BrandWordmark } from "../components/BrandWordmark";
import { ThemeToggle } from "../components/ThemeToggle";
import { Badge } from "../components/Badge";
import { EyeOffIcon, LockIcon, SparkIcon, LeafIcon, ShieldIcon, ArrowRightIcon } from "../components/layout/icons";

const primaryBtn =
	"inline-flex items-center justify-center gap-2 rounded-full bg-coral px-5 py-2.5 text-[15px] font-medium text-white shadow-soft transition-transform hover:scale-[1.02] active:scale-[.99] focus-visible:outline-none";
const ghostBtn =
	"inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-[15px] font-medium text-ink-2 transition-colors hover:text-coral focus-visible:outline-none";

/**
 * Public front door for The CycleVault Social (brand register). A calm welcome
 * that explains what this is and why it's different, then invites visitors to step
 * inside. Signed-in members skip straight to their feed.
 */
export default function LandingPage() {
	const { user, loading } = useAuth();
	const communities = useCommunities();

	if (loading) return null;
	if (user) return <Navigate to="/feed" replace />;

	const circles = (communities.data ?? []).slice().sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0));

	return (
		<div className="relative min-h-dvh overflow-hidden bg-bg text-ink">
			{/* Header */}
			<header className="relative z-20">
				<div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
					<Link to="/" aria-label="The CycleVault Social — home" className="text-[17px]">
						<BrandWordmark />
					</Link>
					<div className="flex items-center gap-2 sm:gap-3">
						<ThemeToggle />
						<Link to="/login" className="hidden rounded-full px-4 py-2 text-sm font-medium text-ink-2 transition-colors hover:text-coral sm:inline-flex">
							Sign in
						</Link>
						<Link to="/feed" className="inline-flex items-center gap-1.5 rounded-full bg-coral px-4 py-2 text-sm font-medium text-white transition-transform hover:scale-[1.02]">
							Enter the community <ArrowRightIcon size={16} />
						</Link>
					</div>
				</div>
			</header>

			{/* Hero */}
			<section className="relative z-10">
				<div className="landing-aura" aria-hidden="true" />
				<div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-14 pt-10 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-14 lg:pb-24 lg:pt-16">
					<div className="motion-safe:animate-[riseIn_.6s_cubic-bezier(.16,1,.3,1)_both]">
						<span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 text-[13px] font-medium text-ink-2 backdrop-blur">
							<span className="h-1.5 w-1.5 rounded-full bg-coral" aria-hidden="true" /> Private. Local. Yours.
						</span>
						<h1 className="mt-5 font-serif text-[2.5rem] font-semibold leading-[1.04] tracking-tight text-ink [text-wrap:balance] sm:text-5xl lg:text-[3.4rem]">
							A calmer place to talk about <span className="brand-serif text-coral">your cycle</span>.
						</h1>
						<p className="mt-4 max-w-[34rem] text-[17px] leading-relaxed text-muted [text-wrap:pretty]">
							Honest questions, kind answers, and verified experts — in a private community that never tracks you or sells what you share.
						</p>
						<div className="mt-7 flex flex-wrap items-center gap-3">
							<Link to="/feed" className={primaryBtn}>
								Enter the community <ArrowRightIcon size={18} />
							</Link>
							<Link to="/login" className={ghostBtn}>
								Join free
							</Link>
						</div>
					</div>

					<div className="motion-safe:animate-[riseIn_.7s_cubic-bezier(.16,1,.3,1)_.08s_both]">
						<ThreadPreview />
					</div>
				</div>
			</section>

			{/* Why it's different */}
			<section className="relative z-10 border-t border-line bg-surface/40">
				<div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
					<h2 className="max-w-2xl font-serif text-3xl font-semibold leading-tight text-ink [text-wrap:balance] sm:text-4xl">
						Not like the other forums.
					</h2>
					<p className="mt-3 max-w-xl text-[16px] leading-relaxed text-muted">
						Most communities are built to keep you scrolling and arguing. This one is built to keep you safe and calm.
					</p>

					<div className="mt-10 grid gap-x-12 gap-y-9 sm:grid-cols-2">
						<Value icon={<EyeOffIcon size={20} />} title="Your name is yours">
							Logged-out visitors can’t see who’s talking. You’re pseudonymous, and your posts are never handed to search engines.
						</Value>
						<Value icon={<LockIcon size={20} />} title="No tracking, ever" tint="lav">
							No behavioral ads, no data sales, no creepy retargeting. Sponsored items are clearly labeled and never personalized to you.
						</Value>
						<Value icon={<SparkIcon size={20} />} title="Real, verified experts">
							Clinicians and educators carry a visible badge, sharing gentle, plain-language help — not diagnoses, not fear.
						</Value>
						<Value icon={<LeafIcon size={20} />} title="Calm by design" tint="lav">
							No infinite scroll, no rage-bait, no red-badge anxiety. Just a quiet, well-lit room to ask and be heard.
						</Value>
					</div>
				</div>
			</section>

			{/* Circles */}
			<section className="relative z-10 border-t border-line">
				<div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
					<div className="flex flex-wrap items-end justify-between gap-4">
						<div>
							<h2 className="font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl">Find your Circle.</h2>
							<p className="mt-3 max-w-xl text-[16px] leading-relaxed text-muted">
								Member-made spaces for the things you’re actually living — from first periods to PCOS, TTC, and perimenopause.
							</p>
						</div>
						<Link to="/feed" className="inline-flex items-center gap-1.5 text-[15px] font-medium text-coral hover:underline">
							Browse everything <ArrowRightIcon size={16} />
						</Link>
					</div>

					{circles.length > 0 ? (
						<div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{circles.slice(0, 9).map((c) => (
								<Link
									key={c.slug}
									to={`/c/${c.slug}`}
									className="group flex gap-3 rounded-2xl border border-line bg-surface p-4 transition-shadow hover:shadow-soft">
									<span
										aria-hidden="true"
										className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold ${
											c.color === "lav" ? "bg-lav-wash text-lav" : "bg-coral-wash text-coral"
										}`}>
										{c.name.slice(0, 1)}
									</span>
									<div className="min-w-0">
										<p className="truncate font-medium text-ink group-hover:text-coral">{c.name}</p>
										<p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted">{c.description}</p>
									</div>
								</Link>
							))}
						</div>
					) : (
						<div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
							{Array.from({ length: 6 }).map((_, i) => (
								<div key={i} className="h-[84px] animate-pulse rounded-2xl border border-line bg-bg-2/60" />
							))}
						</div>
					)}
				</div>
			</section>

			{/* Safety */}
			<section className="relative z-10 border-t border-line bg-surface/40">
				<div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-16 sm:px-8 lg:flex-row lg:items-center lg:gap-12 lg:py-20">
					<div className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-coral-wash text-coral">
						<ShieldIcon size={28} />
					</div>
					<div className="max-w-2xl">
						<h2 className="font-serif text-2xl font-semibold leading-tight text-ink sm:text-3xl">Held with care, not algorithms alone.</h2>
						<p className="mt-3 text-[16px] leading-relaxed text-muted">
							Every post passes gentle safety screening, with real people reviewing anything sensitive. Crisis moments are met with
							support, never punishment. Repeated harm is handled quietly and fairly.
						</p>
						<Link to="/guidelines" className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-medium text-lav hover:underline">
							Read the Community Guidelines <ArrowRightIcon size={16} />
						</Link>
					</div>
				</div>
			</section>

			{/* Final CTA */}
			<section className="relative z-10 px-5 py-16 sm:px-8 lg:py-24">
				<div className="mx-auto max-w-4xl rounded-[28px] border border-line bg-gradient-to-br from-coral-wash to-lav-wash p-10 text-center sm:p-14">
					<h2 className="font-serif text-3xl font-semibold leading-tight text-ink [text-wrap:balance] sm:text-[2.6rem]">
						Step inside. It’s calm in here.
					</h2>
					<p className="mx-auto mt-3 max-w-md text-[16px] leading-relaxed text-ink-2">
						Free to read and free to join. Browse first if you like — no pressure, no tracking.
					</p>
					<div className="mt-7 flex flex-wrap justify-center gap-3">
						<Link to="/feed" className={primaryBtn}>
							Enter the community <ArrowRightIcon size={18} />
						</Link>
						<Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-full border border-ink/10 bg-surface px-5 py-2.5 text-[15px] font-medium text-ink-2 transition-colors hover:text-coral">
							Create an account
						</Link>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="relative z-10 border-t border-line">
				<div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
					<p>
						<span className="brand-serif text-coral">The CycleVault</span> · Private. Local. Yours.
					</p>
					<nav className="flex flex-wrap gap-x-5 gap-y-1">
						<Link to="/guidelines" className="hover:text-coral">
							Guidelines
						</Link>
						<Link to="/privacy" className="hover:text-coral">
							Privacy
						</Link>
						<Link to="/terms" className="hover:text-coral">
							Terms
						</Link>
						<Link to="/shop" className="hover:text-coral">
							Shop
						</Link>
						<a href="https://thecyclevault.com" className="hover:text-coral">
							The app
						</a>
					</nav>
				</div>
				<p className="mx-auto max-w-6xl px-5 pb-8 text-[13px] text-muted-2 sm:px-8">
					A community companion to The CycleVault. This platform does not provide medical advice — consult a clinician for health concerns.
				</p>
			</footer>
		</div>
	);
}

/** A single differentiator: soft icon chip + title + one calm line. */
function Value({ icon, title, children, tint = "coral" }: { icon: React.ReactNode; title: string; children: React.ReactNode; tint?: "coral" | "lav" }) {
	return (
		<div className="flex gap-4">
			<div
				className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
					tint === "lav" ? "bg-lav-wash text-lav" : "bg-coral-wash text-coral"
				}`}>
				{icon}
			</div>
			<div>
				<h3 className="text-[17px] font-semibold text-ink">{title}</h3>
				<p className="mt-1 text-[15px] leading-relaxed text-muted [text-wrap:pretty]">{children}</p>
			</div>
		</div>
	);
}

/**
 * An honest, non-interactive glimpse of the product's tone, built from the real
 * design language (and the real Badge component) — a worried question met by a kind,
 * verified-clinician reply. Not a screenshot; a composed preview.
 */
function ThreadPreview() {
	return (
		<div className="relative">
			<div className="relative rounded-[26px] border border-line bg-surface/85 p-3 shadow-lift backdrop-blur sm:p-4">
				<div className="rounded-2xl border border-line bg-bg p-4">
					<div className="flex items-center gap-2 text-xs text-muted">
						<span className="font-medium text-lav">cycle-questions</span>
						<span aria-hidden="true">·</span>
						<span>quietwillow</span>
						<span aria-hidden="true">·</span>
						<span>2h</span>
					</div>
					<h3 className="mt-1.5 text-[17px] font-semibold leading-snug text-ink">Is a 26-day cycle normal?</h3>
					<p className="mt-1 text-[14px] leading-relaxed text-muted">Mine’s been 26 days for a few months — is that something to worry about?</p>
					<div className="mt-3 flex items-center gap-3 text-xs text-muted-2">
						<span className="inline-flex items-center gap-1 rounded-full bg-bg-2 px-2 py-1">▲ 24</span>
						<span>8 replies</span>
					</div>
				</div>

				<div className="ml-5 mt-3 rounded-2xl border border-lav-soft/50 bg-lav-wash/40 p-4 sm:ml-8">
					<div className="flex flex-wrap items-center gap-2 text-xs text-muted">
						<span className="font-medium text-ink-2">Dr. Maya</span>
						<Badge kind="clinician" />
						<span aria-hidden="true">·</span>
						<span>1h</span>
					</div>
					<p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">
						Totally normal — typical cycles run anywhere from 21 to 35 days. Keep tracking; if it changes suddenly, check in with your
						clinician. You’re doing great. 🌿
					</p>
				</div>
			</div>
		</div>
	);
}
