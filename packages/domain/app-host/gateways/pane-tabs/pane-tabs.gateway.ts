export abstract class PaneTabsGateway {
	abstract tabIdsInPanes(): readonly string[];
	abstract reveal(tabId: string): void;
	abstract closePanesOf(tabIds: readonly string[]): void;
	abstract openShownTabPane(): void;
	abstract closeShownTabPane(): void;
	abstract showInTargetPane(tabId: string): boolean;
	abstract watch(changed: () => void): () => void;
}
