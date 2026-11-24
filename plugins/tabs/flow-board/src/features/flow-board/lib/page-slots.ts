import type { PaneView } from "@widgetarium/app-host/contract";
import { panesOf } from "@sumi/flow-strip-plugin";
import type { FlowBoard, FlowTab } from "@sumi/flow-strip-plugin";

export interface PageSlot {
	readonly key: string;
	readonly paneId: string;
	readonly view: PaneView;
	readonly isActive: boolean;
}

export function pageSlotsOf(board: FlowBoard): readonly PageSlot[] {
	const slots = panesOf(board.layout.root).flatMap((pane) => {
		if (pane.tabIds.length === 0) {
			return [emptySlotOf(pane.id)];
		}

		const activeId = pane.activeTabId ?? pane.tabIds[0];
		return board.tabs
			.filter(({ id }) => pane.tabIds.includes(id))
			.map((tab) => ({
				key: tab.id,
				paneId: pane.id,
				view: viewOf(tab),
				isActive: tab.id === activeId,
			}));
	});
	return [...slots].sort((first, second) => first.key.localeCompare(second.key));
}

function emptySlotOf(paneId: string): PageSlot {
	return {
		key: `empty:${paneId}`,
		paneId,
		view: {
			kind: "app",
			tabId: null,
		},
		isActive: true,
	};
}

function viewOf(tab: FlowTab): PaneView {
	return tab.isChat ? { kind: "chat", chatId: tab.id } : { kind: "app", tabId: tab.id };
}
