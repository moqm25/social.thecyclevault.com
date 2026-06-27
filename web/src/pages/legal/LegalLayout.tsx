import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/** Shared layout for legal / policy pages — calm, readable, brand-consistent. */
export function LegalLayout({
	title,
	updated,
	children,
}: {
	title: string;
	updated: string;
	children: ReactNode;
}) {
	return (
		<article className="mx-auto max-w-2xl">
			<nav className="mb-6 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
				<Link to="/privacy" className="hover:text-coral">
					Privacy
				</Link>
				<Link to="/terms" className="hover:text-coral">
					Terms
				</Link>
				<Link to="/guidelines" className="hover:text-coral">
					Community Guidelines
				</Link>
			</nav>

			<h1 className="text-2xl font-semibold text-ink">{title}</h1>
			<p className="mt-1 text-sm text-muted">Last updated: {updated}</p>

			<div className="legal-prose mt-6 space-y-5 text-[15px] leading-relaxed text-ink-2">{children}</div>

			<p className="mt-10 border-t border-line pt-5 text-sm text-muted">
				Questions? Email{" "}
				<a href="mailto:privacy@thecyclevault.com" className="font-medium text-coral hover:underline">
					privacy@thecyclevault.com
				</a>
				. The CycleVault Social is a community of The CycleVault — private, local, yours.
			</p>
		</article>
	);
}

/** A titled section within a legal page. */
export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
	return (
		<section className="space-y-2">
			<h2 className="text-lg font-semibold text-ink">{heading}</h2>
			{children}
		</section>
	);
}
