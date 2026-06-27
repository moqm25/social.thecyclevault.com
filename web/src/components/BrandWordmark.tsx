/**
 * Brand wordmark — "The CycleVault" with "The" kept as part of the name and a
 * Fraunces italic accent on the brand. Used in the top bar and auth screens.
 */
export function BrandWordmark({ className = "" }: { className?: string }) {
	return (
		<span className={`font-semibold tracking-tight ${className}`}>
			The <span className="brand-serif text-coral">CycleVault</span>
			<span className="text-muted"> Social</span>
		</span>
	);
}
