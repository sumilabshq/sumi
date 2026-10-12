export function turnedAway(what: string, asked: string, now: string): void {
	console.info(`[widgetarium] ${what} dropped: the page turned ${asked} → ${now} while it was read`);
}
