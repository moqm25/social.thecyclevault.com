import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "./layout/icons";

interface ModalProps {
	open: boolean;
	onClose: () => void;
	title: ReactNode;
	description?: ReactNode;
	children: ReactNode;
	footer?: ReactNode;
	icon?: ReactNode;
	size?: "md" | "lg";
}

/**
 * Accessible centered dialog (the project's first shared modal primitive). Handles
 * backdrop click, Escape-to-close, background scroll lock, focus move-in and
 * restore, and labelling. Rendered through a portal so it escapes any overflow/
 * stacking context. Motion is gated by `motion-safe:` (respects reduced-motion).
 */
export function Modal({ open, onClose, title, description, children, footer, icon, size = "md" }: ModalProps) {
	const panelRef = useRef<HTMLDivElement>(null);
	const titleId = useId();

	useEffect(() => {
		if (!open) return;
		const prevActive = document.activeElement as HTMLElement | null;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKey);
		document.body.style.overflow = "hidden";
		panelRef.current?.focus();
		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = "";
			prevActive?.focus?.();
		};
	}, [open, onClose]);

	if (!open) return null;

	return createPortal(
		<div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby={titleId}>
			<div className="fixed inset-0 bg-ink/35 backdrop-blur-sm motion-safe:animate-[fade_.15s_ease-out]" onClick={onClose} aria-hidden="true" />
			<div
				ref={panelRef}
				tabIndex={-1}
				className={`relative my-auto w-full ${
					size === "lg" ? "max-w-2xl" : "max-w-lg"
				} rounded-2xl border border-line bg-surface shadow-lift outline-none motion-safe:animate-[riseIn_.22s_cubic-bezier(.16,1,.3,1)]`}>
				<header className="flex items-start gap-3 border-b border-line px-5 py-4">
					{icon && <div className="mt-0.5 shrink-0">{icon}</div>}
					<div className="min-w-0 flex-1">
						<h2 id={titleId} className="text-base font-semibold text-ink">
							{title}
						</h2>
						{description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-2 transition-colors hover:bg-bg-2 hover:text-coral">
						<CloseIcon />
					</button>
				</header>
				<div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
				{footer && <footer className="border-t border-line px-5 py-4">{footer}</footer>}
			</div>
		</div>,
		document.body,
	);
}
