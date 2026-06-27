import { Link } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthProvider";
import { LockIcon, SparkIcon, HeartIcon } from "./icons";

/**
 * Right context rail (product register): calm, low-density supporting cards.
 * Context-aware top card (guest welcome / Supporter nudge), a short "why it's calm"
 * note, and quiet footer links. Hidden below xl so it never crowds the content.
 */
export function RightRail() {
	const { user, profile } = useAuth();
	const isSupporter = profile?.supporter === true;

	return (
		<div className="flex flex-col gap-4 text-[14px]">
			{!user ? (
				<Card>
					<div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-lav-wash text-lav">
						<LockIcon size={18} />
					</div>
					<h2 className="font-serif text-lg font-semibold text-ink">Step inside</h2>
					<p className="mt-1 leading-relaxed text-muted">
						You’re browsing as a guest, so names stay hidden. Join free to see who’s talking and to post, reply, and vote.
					</p>
					<div className="mt-3 flex flex-col gap-2">
						<Link
							to="/login"
							className="inline-flex items-center justify-center rounded-full bg-coral px-4 py-2 font-medium text-white transition-transform hover:scale-[1.015]">
							Join free
						</Link>
						<Link to="/login" className="inline-flex items-center justify-center rounded-full px-4 py-2 font-medium text-ink-2 hover:text-coral">
							Sign in
						</Link>
					</div>
				</Card>
			) : isSupporter ? (
				<Card>
					<div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-coral-wash text-coral">
						<SparkIcon size={18} />
					</div>
					<h2 className="font-serif text-lg font-semibold text-ink">Thank you ✦</h2>
					<p className="mt-1 leading-relaxed text-muted">
						Your support keeps this place calm, private, and ad-free. It genuinely sustains the community.
					</p>
				</Card>
			) : (
				<Card>
					<div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-coral-wash text-coral">
						<HeartIcon size={18} />
					</div>
					<h2 className="font-serif text-lg font-semibold text-ink">Keep it calm &amp; ad-free</h2>
					<p className="mt-1 leading-relaxed text-muted">
						The CycleVault Social is free and always will be. Supporters remove sponsored placements and keep the lights on.
					</p>
					<Link to="/supporter" className="mt-3 inline-flex items-center font-medium text-coral hover:underline">
						Become a Supporter →
					</Link>
				</Card>
			)}

			<Card>
				<h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-2">Why it feels calm</h2>
				<ul className="mt-2 space-y-2 text-muted">
					<li className="flex gap-2">
						<Dot /> No tracking, no data sales, no behavioral ads.
					</li>
					<li className="flex gap-2">
						<Dot /> Names are hidden from logged-out guests.
					</li>
					<li className="flex gap-2">
						<Dot /> Real moderation, gentle by design.
					</li>
				</ul>
				<Link to="/guidelines" className="mt-3 inline-flex items-center font-medium text-lav hover:underline">
					Community Guidelines →
				</Link>
			</Card>

			<footer className="px-2 text-[13px] text-muted-2">
				<nav className="flex flex-wrap gap-x-3 gap-y-1">
					<Link to="/privacy" className="hover:text-coral">
						Privacy
					</Link>
					<Link to="/terms" className="hover:text-coral">
						Terms
					</Link>
					<Link to="/guidelines" className="hover:text-coral">
						Guidelines
					</Link>
					<Link to="/shop" className="hover:text-coral">
						Shop
					</Link>
				</nav>
				<p className="mt-2 leading-relaxed">Not medical advice. Consult a clinician for health concerns.</p>
				<p className="mt-1.5">
					<span className="brand-serif text-coral">The CycleVault</span> · Private. Local. Yours.
				</p>
			</footer>
		</div>
	);
}

function Card({ children }: { children: React.ReactNode }) {
	return <section className="rounded-2xl border border-line bg-surface p-4 shadow-soft">{children}</section>;
}

function Dot() {
	return <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lav" />;
}
