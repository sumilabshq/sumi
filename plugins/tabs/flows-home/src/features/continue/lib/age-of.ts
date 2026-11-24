const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function ageOf(at: number, now: number): string {
	const passed = Math.max(0, now - at);

	if (passed < MINUTE_MS) {
		return "now";
	}

	if (passed < HOUR_MS) {
		return `${Math.floor(passed / MINUTE_MS)}m`;
	}

	return passed < DAY_MS ? `${Math.floor(passed / HOUR_MS)}h` : `${Math.floor(passed / DAY_MS)}d`;
}
