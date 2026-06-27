/** Compact relative-time formatter, e.g. "just now", "5m", "3h", "2d", "Mar 4". */
export function relativeTime(input: number | Date | { toMillis: () => number } | null | undefined): string {
	if (input == null) return "";
	let ms: number;
	if (typeof input === "number") ms = input;
	else if (input instanceof Date) ms = input.getTime();
	else if (typeof (input as { toMillis?: () => number }).toMillis === "function") ms = (input as { toMillis: () => number }).toMillis();
	else return "";

	const diff = Date.now() - ms;
	const sec = Math.round(diff / 1000);
	if (sec < 45) return "just now";
	const min = Math.round(sec / 60);
	if (min < 60) return `${min}m`;
	const hr = Math.round(min / 60);
	if (hr < 24) return `${hr}h`;
	const day = Math.round(hr / 24);
	if (day < 7) return `${day}d`;

	const d = new Date(ms);
	const sameYear = d.getFullYear() === new Date().getFullYear();
	return d.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		...(sameYear ? {} : { year: "numeric" }),
	});
}
