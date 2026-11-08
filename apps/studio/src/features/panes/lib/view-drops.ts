import type { CommandHandle, OutputOf, SentOf } from "@widgetarium/data-framework";
import type { appHost } from "@widgetarium/app-host";
import type { PaneBoard, PaneLeaf, PanePlacement, PaneView, layout } from "@widgetarium/layout";
import { carriedTabOf, viewTargetOf } from "./split-panes.js";

export interface Carrying {
	readonly view: PaneView;
	readonly home: string | null;
	readonly isTab: boolean;
	readonly isPane: boolean;
}

export interface OnBoard {
	readonly leaves: readonly PaneLeaf[];
	readonly groups: PaneBoard["chatGroups"];
}

export interface Dropping {
	readonly aimed: PanePlacement;
	readonly carrying: Carrying;
	readonly board: OnBoard;
}

type HandleOf<R extends typeof layout.panes.placePane | typeof appHost.splits.placeInView> = CommandHandle<
	SentOf<R>,
	OutputOf<R>
>;

export interface Placers {
	readonly placePane: HandleOf<typeof layout.panes.placePane>;
	readonly placeInView: HandleOf<typeof appHost.splits.placeInView>;
}

type PlaceInViewAsk = SentOf<typeof appHost.splits.placeInView>;

export async function dropped(dropping: Dropping, { placePane, placeInView }: Placers): Promise<void> {
	const isPlacedInView = await placedInView(dropping, placeInView);

	if (isPlacedInView) {
		return;
	}

	const answer = await placePane.run(dropping.aimed);

	if (!answer.ok) {
		console.error(`[widgetarium] drop on the pane board refused: ${answer.reason}`);
	}
}

async function placedInView(dropping: Dropping, placeInView: Placers["placeInView"]): Promise<boolean> {
	const asked = viewPlacingOf(dropping);

	if (asked === null) {
		return false;
	}

	const answer = await placeInView.run(asked);

	if (!answer.ok) {
		console.error(`[widgetarium] drop into the view refused: ${answer.reason}`);
		return true;
	}

	return answer.output.isPlaced;
}

function viewPlacingOf({ aimed, carrying, board }: Dropping): PlaceInViewAsk | null {
	const tabId = carriedTabOf(carrying.view);
	const isOwnStage = carrying.isTab && carrying.home !== null;

	if (tabId === null || isOwnStage) {
		return null;
	}

	const target = viewTargetOf(aimed.targetId, board.leaves, board.groups);
	return target === null ? null : { tabId, targetTabId: target.tabId, side: aimed.side, isPaneMoved: carrying.isPane };
}
