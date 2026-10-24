interface Watched {
	readonly watch: (changed: () => void) => () => void;
}

export interface WatchedTabs {
	readonly appTabsGateway: Watched;
	readonly pageFactsGateway: Watched;
	readonly hostTabs: Watched;
	readonly essentials: Watched;
	readonly activeChatGateway: Watched;
	readonly tabsColumnStore: Watched;
	readonly paneTabsGateway: Watched;
}

export function watchTabs(parts: WatchedTabs, changed: () => void): () => void {
	const settled = onceWritesSettle(changed);
	const watched: readonly Watched[] = [
		parts.appTabsGateway,
		parts.pageFactsGateway,
		parts.hostTabs,
		parts.essentials,
		parts.activeChatGateway,
		parts.tabsColumnStore,
		parts.paneTabsGateway,
	];
	const stops = watched.map((part) => part.watch(settled));
	return () => stops.forEach((stop) => stop());
}

// TRADE-OFF: one read per command, because a query read while one runs answers that run's stale result
function onceWritesSettle(changed: () => void): () => void {
	let isQueued = false;
	return () => {
		if (isQueued) {
			return;
		}

		isQueued = true;
		queueMicrotask(() => {
			isQueued = false;
			changed();
		});
	};
}
