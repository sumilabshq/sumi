import { PaneTabsGateway } from "@widgetarium/app-host/gateways";
import type { ShellParts } from "@widgetarium/shell/gateways";

type PaneTreeStore = ShellParts["paneTreeStore"];

const REVEAL: readonly Keyframe[] = [{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }];
const REVEAL_MS = 420;

export class ShellPaneTabsGateway extends PaneTabsGateway {
	constructor(private readonly paneTreeStore: PaneTreeStore) {
		super();
	}

	tabIdsInPanes(): readonly string[] {
		return this.tabPanes().map(([, tabId]) => tabId);
	}

	// TRADE-OFF: a pane flashes by a direct animation, since a reveal is a moment and no state
	reveal(tabId: string): void {
		const paneId = this.tabPanes().find(([, shown]) => shown === tabId)?.[0];
		const pane = paneId === undefined ? null : document.querySelector(`[data-pane-id="${CSS.escape(paneId)}"]`);
		pane?.animate([...REVEAL], REVEAL_MS);
	}

	watch(changed: () => void): () => void {
		return this.paneTreeStore.watch(changed);
	}

	private tabPanes(): readonly (readonly [string, string])[] {
		return this.paneTreeStore
			.leaves()
			.flatMap((leaf) => (leaf.view.kind === "app" && leaf.view.tabId !== null ? [[leaf.id, leaf.view.tabId]] : []));
	}
}
