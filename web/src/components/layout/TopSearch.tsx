import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { SearchIcon } from "./icons";

/**
 * Top-bar search. An inline field on >= sm; a single icon button on mobile that
 * jumps to the full search page. Submitting routes to /search?q=… (the results
 * surface), so search is linkable and survives refresh. Prefilled from the URL
 * when you're already on /search.
 */
export function TopSearch() {
	const navigate = useNavigate();
	const [params] = useSearchParams();
	const [value, setValue] = useState(params.get("q") ?? "");
	const inputRef = useRef<HTMLInputElement>(null);

	// Keep the field in sync when the URL query changes (e.g. back/forward).
	useEffect(() => {
		setValue(params.get("q") ?? "");
	}, [params]);

	function submit(e: React.FormEvent) {
		e.preventDefault();
		const q = value.trim();
		if (!q) return;
		navigate(`/search?q=${encodeURIComponent(q)}`);
		inputRef.current?.blur();
	}

	return (
		<>
			{/* Desktop / tablet: inline field */}
			<form onSubmit={submit} role="search" className="relative ml-1 hidden max-w-md flex-1 sm:block">
				<span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-2">
					<SearchIcon size={17} />
				</span>
				<input
					ref={inputRef}
					type="search"
					value={value}
					onChange={(e) => setValue(e.target.value)}
					placeholder="Search posts, circles, topics…"
					aria-label="Search the community"
					className="w-full rounded-full border border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-muted-2 focus:border-lav"
				/>
			</form>

			{/* Mobile: icon → full search page */}
			<Link
				to="/search"
				aria-label="Search"
				className="grid h-9 w-9 place-items-center rounded-full text-ink-2 transition-colors hover:bg-bg-2 hover:text-coral sm:hidden">
				<SearchIcon />
			</Link>
		</>
	);
}
