import { placesWindowOf } from "../packages/shared/behaviors/src/studio-window/studio-window.ts";
import { Refused } from "../packages/shared/data-framework/src/index.ts";
import { MemoryTabsGateway } from "../plugins/tabs/navigation/data/navigation/gateways/tabs/memory.gateway.ts";
import type { ListedPlacedAppsGateway } from "../plugins/tabs/navigation/data/navigation/gateways/placed-apps/listed.gateway.ts";
import { emptyPlacedTabs } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/kept-tabs.ts";
import { FIRST_PANES } from "../plugins/tabs/navigation/data/navigation/shared/lib/panes/kept-panes.ts";
import { leavesOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/panes/pane-nodes.ts";
import { placedWithPanes, windowBoardOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/panes/window-boards.ts";
import type { PaneTree, WindowSeat } from "../plugins/tabs/navigation/data/navigation/shared/schema/pane-tree.schema.ts";
import type { PlacedTabs } from "../plugins/tabs/navigation/data/navigation/shared/schema/tabs.schema.ts";
import { BUILT_IN_APPS, builtInPlacedApps } from "./placed-apps-fixture.ts";

export const PANES_SEAT: WindowSeat = {
	window: placesWindowOf("main", "panes"),
	boot: null,
};

export interface PaneParts {
	readonly tabs: MemoryTabsGateway;
	readonly placedApps: ListedPlacedAppsGateway;
	readonly seat: WindowSeat;
}

export function placedWithTree(placed: PlacedTabs, window: string, tree: PaneTree): PlacedTabs {
	return placedWithPanes(placed, window, tree);
}

export function panePartsOf(tree: PaneTree = FIRST_PANES, seat: WindowSeat = PANES_SEAT): PaneParts {
	return {
		tabs: new MemoryTabsGateway(placedWithTree(emptyPlacedTabs(), seat.window, tree)),
		placedApps: builtInPlacedApps(),
		seat,
	};
}

export async function treeOf({ tabs, seat }: PaneParts): Promise<PaneTree> {
	return windowBoardOf({ placed: await tabs.placedTabs(), seat, apps: BUILT_IN_APPS }).tree;
}

export async function shapeOf(parts: PaneParts): Promise<readonly string[]> {
	return leavesOf((await treeOf(parts)).root).map((leaf) =>
		leaf.view.kind === "chat" ? "chat" : (leaf.view.tabId ?? "shown"),
	);
}

export async function refusalOf(run: () => Promise<unknown>): Promise<string | null> {
	try {
		await run();
		return null;
	} catch (thrown: unknown) {
		if (thrown instanceof Refused) {
			return thrown.message;
		}

		throw thrown;
	}
}

export async function infosOf(run: () => Promise<unknown>): Promise<string[]> {
	const said: string[] = [];
	const wasInfo = console.info;
	console.info = (line: string) => said.push(line);
	await run();
	console.info = wasInfo;
	return said;
}
