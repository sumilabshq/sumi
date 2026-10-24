import { PaneTabsGateway } from "@widgetarium/app-host/gateways";
import type { LayoutParts } from "@widgetarium/layout/gateways";

type PaneTreeStore = LayoutParts["paneTreeStore"];

const REVEAL: readonly Keyframe[] = [{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }];
const REVEAL_MS = 420;

export class LayoutPaneTabsGateway extends PaneTabsGateway {
	constructor(private readonly paneTreeStore: PaneTreeStore) {
		super();
	}

	tabIdsInPanes(): readonly string[] {
		return this.tabPanes().map(([, tabId]) => tabId);
	}

	// TRADE-OFF: a pane flashes by a direct animation, since a reveal is a moment and no state
	reveal(tabId: string): void {
		const paneId = this.tabPanes().find(([, shown]) => shown === tabId)?.[0];

		if (paneId === undefined) {
			return;
		}

		document.querySelector(`[data-pane-id="${CSS.escape(paneId)}"]`)?.animate([...REVEAL], REVEAL_MS);
	}

	closePanesOf(tabIds: readonly string[]): void {
		for (const [paneId, tabId] of this.tabPanes()) {
			if (tabIds.includes(tabId)) {
				this.paneTreeStore.close(paneId);
			}
		}
	}

	openShownTabPane(): void {
		if (this.shownTabPaneId() !== null) {
			return;
		}

		const chat = this.paneTreeStore.leaves().find((leaf) => leaf.view.kind === "chat");
		this.paneTreeStore.place(
			{
				kind: "app",
				tabId: null,
			},
			{
				targetId: chat?.id ?? null,
				side: "right",
			},
		);
	}

	closeShownTabPane(): void {
		const paneId = this.shownTabPaneId();

		if (paneId !== null) {
			this.paneTreeStore.close(paneId);
		}
	}

	showInTargetPane(tabId: string): boolean {
		const { targetId } = this.paneTreeStore.now();
		const target = this.paneTreeStore.leaves().find((leaf) => leaf.id === targetId);

		if (target === undefined || target.view.kind !== "app" || target.view.tabId === null) {
			return false;
		}

		this.paneTreeStore.showIn(target.id, tabId);
		return true;
	}

	watch(changed: () => void): () => void {
		return this.paneTreeStore.watch(changed);
	}

	private shownTabPaneId(): string | null {
		return this.paneTreeStore.leaves().find((leaf) => leaf.view.kind === "app" && leaf.view.tabId === null)?.id ?? null;
	}

	private tabPanes(): readonly (readonly [string, string])[] {
		return this.paneTreeStore
			.leaves()
			.flatMap((leaf) => (leaf.view.kind === "app" && leaf.view.tabId !== null ? [[leaf.id, leaf.view.tabId]] : []));
	}
}
