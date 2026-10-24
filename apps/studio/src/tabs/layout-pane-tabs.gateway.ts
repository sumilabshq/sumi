import { PaneTabsGateway } from "@widgetarium/app-host/gateways";
import type { Answer, StartedApp } from "@widgetarium/core/requests";
import {
	ClosePanesOfTabsCommand,
	CloseShownTabPaneCommand,
	OpenShownTabPaneCommand,
	PaneTreeQuery,
	ShowTabInTargetPaneCommand,
} from "@widgetarium/layout";
import type { PaneBoard } from "@widgetarium/layout";

const REVEAL: readonly Keyframe[] = [{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }];
const REVEAL_MS = 420;
const NO_BOARD: PaneBoard = {
	root: null,
	targetId: null,
	tabTargetId: null,
	leaves: [],
	tabPanes: [],
};

// TRADE-OFF: the port stays synchronous, leaning on a local Repeatable command saving inside send()
export class LayoutPaneTabsGateway extends PaneTabsGateway {
	constructor(private readonly layoutApp: StartedApp) {
		super();
	}

	tabIdsInPanes(): readonly string[] {
		return this.board().tabPanes.map(({ tabId }) => tabId);
	}

	// TRADE-OFF: a pane flashes by a direct animation, since a reveal is a moment and no state
	reveal(tabId: string): void {
		const paneId = this.board().tabPanes.find((pane) => pane.tabId === tabId)?.paneId;

		if (paneId === undefined) {
			return;
		}

		document.querySelector(`[data-pane-id="${CSS.escape(paneId)}"]`)?.animate([...REVEAL], REVEAL_MS);
	}

	closePanesOf(tabIds: readonly string[]): void {
		void reportRefused("close the panes of the tabs", this.layoutApp.send(ClosePanesOfTabsCommand, { tabIds }));
	}

	openShownTabPane(): void {
		void reportRefused("open the shown tab pane", this.layoutApp.send(OpenShownTabPaneCommand));
	}

	closeShownTabPane(): void {
		void reportRefused("close the shown tab pane", this.layoutApp.send(CloseShownTabPaneCommand));
	}

	showInTargetPane(tabId: string): boolean {
		if (this.board().tabTargetId === null) {
			return false;
		}

		void reportRefused(`show ${tabId} in the target pane`, this.layoutApp.send(ShowTabInTargetPaneCommand, { tabId }));
		return true;
	}

	watch(changed: () => void): () => void {
		return this.layoutApp.routes.watch(PaneTreeQuery, undefined, changed);
	}

	private board(): PaneBoard {
		const read = this.layoutApp.routes.readNow(PaneTreeQuery);
		return read === null ? NO_BOARD : PaneTreeQuery.outputSchema.parse(read.output);
	}
}

export async function reportRefused(what: string, answer: Promise<Answer<unknown>>): Promise<void> {
	const answered = await answer;

	if (!answered.ok) {
		console.error(`[widgetarium] the pane tabs could not ${what}: ${answered.reason}`);
	}
}
