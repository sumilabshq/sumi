export const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const JUST_NOW = "just now";

const AGO = new Intl.RelativeTimeFormat("en", { numeric: "always" });
const FULL = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

export function timeAgoSaidOf(at: number, now: number): string {
	const pastMs = Math.max(0, now - at);

	if (pastMs < MINUTE_MS) {
		return JUST_NOW;
	}

	if (pastMs < HOUR_MS) {
		return AGO.format(-Math.floor(pastMs / MINUTE_MS), "minute");
	}

	if (pastMs < DAY_MS) {
		return AGO.format(-Math.floor(pastMs / HOUR_MS), "hour");
	}

	return AGO.format(-Math.floor(pastMs / DAY_MS), "day");
}

export function fullTimeSaidOf(at: number): string {
	return FULL.format(at);
}
