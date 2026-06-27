import { Link } from "react-router-dom";

export default function NotFoundPage() {
	return (
		<div className="grid place-items-center py-16 text-center">
			<div className="max-w-sm space-y-3">
				<p className="brand-serif text-5xl text-coral">404</p>
				<h1 className="text-xl font-semibold text-ink">Nothing here yet</h1>
				<p className="text-muted">The page you’re looking for doesn’t exist or has moved.</p>
				<Link to="/" className="inline-block font-medium text-coral hover:underline">
					Back home
				</Link>
			</div>
		</div>
	);
}
