const RESETS_TODAY = "Resets at {time}";
const RESETS_LATER = "Resets {day}";
const DAY_MS = 24 * 60 * 60 * 1000;
const CONTEXT_SAID = "{used} of {window} tokens";
const MILLION = 1_000_000;
const THOUSAND = 1000;

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

export function contextSaidOf({ used, window }: { readonly used: number; readonly window: number }): string {
	return CONTEXT_SAID.replace("{used}", tokensOf(used)).replace("{window}", tokensOf(window));
}

function tokensOf(count: number): string {
	if (count >= MILLION) {
		return `${Number((count / MILLION).toFixed(1))}M`;
	}

	if (count >= THOUSAND) {
		return `${Math.round(count / THOUSAND)}k`;
	}

	return String(count);
}
