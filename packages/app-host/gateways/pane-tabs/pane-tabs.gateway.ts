export abstract class PaneTabsGateway {
	abstract tabIdsInPanes(): readonly string[];
	abstract reveal(tabId: string): void;
	abstract watch(changed: () => void): () => void;
}
