const RESETS_TODAY = "Resets at {time}";
const RESETS_LATER = "Resets {day}";
const DAY_MS = 24 * 60 * 60 * 1000;

export function percentOf(used: number): string {
	return `${Math.round(used * 100)}%`;
}

export function resetSaidOf(resetsAt: number, now: number): string {
	const at = new Date(resetsAt);

	if (resetsAt - now < DAY_MS) {
		const time = at.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
		return RESETS_TODAY.replace("{time}", time);
	}

	return RESETS_LATER.replace("{day}", at.toLocaleDateString(undefined, { weekday: "long" }));
}
