export function freeCanvasIdOf(tabId: string, taken: ReadonlySet<string>): string {
	if (!taken.has(tabId)) {
		return tabId;
	}

	const candidates = Array.from({ length: taken.size + 1 }, (_, at) => `${tabId}-${at + 2}`);
	return candidates.find((id) => !taken.has(id)) ?? `${tabId}-${taken.size + 2}`;
}
