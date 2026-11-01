const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const NOW_UNDER_MS = MINUTE_MS;
const CLOCK_DIGITS = 2;

interface AgeWord {
	readonly under: number;
	readonly said: (ago: number) => string;
}

const AGE_WORDS: readonly AgeWord[] = [
	{
		under: NOW_UNDER_MS,
		said: () => "now",
	},
	{
		under: HOUR_MS,
		said: (ago) => `${Math.floor(ago / MINUTE_MS)} min`,
	},
	{
		under: DAY_MS,
		said: (ago) => `${Math.floor(ago / HOUR_MS)} h`,
	},
	{
		under: 2 * DAY_MS,
		said: () => "yesterday",
	},
];

export function ageOf(at: number, now: number): string {
	const ago = Math.max(0, now - at);
	const word = AGE_WORDS.find((step) => ago < step.under);
	return word === undefined ? `${Math.floor(ago / DAY_MS)} d` : word.said(ago);
}

export function agoOf(at: number, now: number): string {
	const age = ageOf(at, now);
	return age === "now" || age === "yesterday" ? age : `${age} ago`;
}

export function clockOf(at: number): string {
	const time = new Date(at);
	return `${String(time.getHours()).padStart(CLOCK_DIGITS, "0")}:${String(time.getMinutes()).padStart(CLOCK_DIGITS, "0")}`;
}

export function dayAndClockOf(at: number, now: number): string {
	const isToday = new Date(at).toDateString() === new Date(now).toDateString();
	return `${isToday ? "today" : new Date(at).toLocaleDateString()}, ${clockOf(at)}`;
}
