import { isDeepStrictEqual } from "node:util";
import { Refused, app } from "../packages/shared/core/src/requests/index.ts";
import { FIRST_PANES, layoutPartsOf } from "../packages/state/layout/gateways/layout-parts/memory.gateway.ts";
import type { LayoutMemories } from "../packages/state/layout/gateways/layout-parts/memory.gateway.ts";
import type { LayoutParts } from "../packages/state/layout/gateways/layout-parts/layout-parts.gateway.ts";
import { JsonMemoryPaneTreeGateway } from "../packages/state/layout/gateways/pane-tree/json-memory.gateway.ts";
import {
	concealedLook,
	peekedLook,
	refuseTurn,
	toggledLook,
} from "../packages/state/layout/features/frame-sides/lib/side-looks.ts";
import { ToggleFrameSideCommand } from "../packages/state/layout/features/frame-sides/requests.ts";
import { FrameWidthsQuery } from "../packages/state/layout/features/frame-widths/requests.ts";
import { leavesOf } from "../packages/state/layout/shared/lib/pane-nodes.ts";
import {
	goneTabPanesOf,
	mintedLeafOf,
	tabTargetOf,
	treeWithoutGoneTabs,
} from "../packages/state/layout/shared/lib/pane-trees.ts";
import {
	AimPaneCommand,
	ClosePaneCommand,
	PlacePaneCommand,
	PlacementPreviewQuery,
	ResizePaneSplitCommand,
} from "../packages/state/layout/features/panes/requests.ts";
import {
	ClosePanesOfTabsCommand,
	CloseShownTabPaneCommand,
	OpenShownTabPaneCommand,
	ShowTabInTargetPaneCommand,
} from "../packages/state/layout/features/pane-tabs/requests.ts";
import { DropGoneTabsCommand } from "../packages/state/layout/generated/contract.ts";
import { LayoutModule } from "../packages/state/layout/module.ts";
import { edgePxWithin, widthsWithin } from "../packages/state/layout/shared/lib/frame-bounds.ts";
import type { PaneTree } from "../packages/state/layout/shared/schema/pane-tree.schema.ts";
import { LayoutPaneTabsGateway } from "../apps/studio/src/tabs/layout-pane-tabs.gateway.ts";

export type Check = (what: string, isOk: boolean, got: unknown) => void;

interface Memory<T> {
	read(): T | null;
	write(value: T): void;
}

export function memoryOf<T>(): Memory<T> {
	let kept: string | null = null;
	return {
		read: () => (kept === null ? null : JSON.parse(kept)),
		write: (value) => {
			kept = JSON.stringify(value);
		},
	};
}

export function memoriesOf(panes: LayoutMemories["panes"] = memoryOf<unknown>()): LayoutMemories {
	return {
		widths: {
			left: memoryOf<number>(),
			chat: memoryOf<number>(),
		},
		sides: {
			left: memoryOf<boolean>(),
			right: memoryOf<boolean>(),
		},
		panes,
	};
}

export function partsOf(tree: PaneTree = FIRST_PANES): LayoutParts {
	return {
		...layoutPartsOf(memoriesOf()),
		paneTree: new JsonMemoryPaneTreeGateway(memoryOf<unknown>(), tree),
	};
}

export function shapeOf(parts: LayoutParts): readonly string[] {
	return leavesOf(parts.paneTree.tree().root).map((leaf) =>
		leaf.view.kind === "chat" ? "chat" : (leaf.view.tabId ?? "shown"),
	);
}

export function refusalOf(run: () => unknown): string | null {
	try {
		run();
		return null;
	} catch (thrown: unknown) {
		if (thrown instanceof Refused) {
			return thrown.message;
		}

		throw thrown;
	}
}

export function infosOf(run: () => void): string[] {
	const said: string[] = [];
	const wasInfo = console.info;
	console.info = (line: string) => said.push(line);
	run();
	console.info = wasInfo;
	return said;
}

function placeTab(parts: LayoutParts, tabId: string, targetId: string): void {
	PlacePaneCommand.handle({ view: { kind: "app", tabId }, targetId, side: "right" }, parts);
}

function checksSideLooks(check: Check): void {
	const looks = [
		["docked", toggledLook("docked"), peekedLook("docked"), concealedLook("docked")],
		["hidden", toggledLook("hidden"), peekedLook("hidden"), concealedLook("hidden")],
		["peeking", toggledLook("peeking"), peekedLook("peeking"), concealedLook("peeking")],
	];
	check(
		"a toggle docks or hides, a peek only opens a hidden side, a conceal only shuts a peeking one",
		JSON.stringify(looks) ===
			'[["docked","hidden","docked","docked"],["hidden","docked","peeking","hidden"],["peeking","docked","peeking","hidden"]]',
		looks,
	);
	check(
		"a docked side may not turn peeking, a hidden one may",
		refuseTurn("docked", "peeking") === "cannot turn docked → peeking" && refuseTurn("hidden", "peeking") === null,
		[refuseTurn("docked", "peeking"), refuseTurn("hidden", "peeking")],
	);
	const parts = partsOf();
	const said = infosOf(() => ToggleFrameSideCommand.handle({ side: "left" }, parts));
	check(
		"a toggle saves the turn and logs it once as was → now",
		parts.frameSides.sides().left === "hidden" &&
			JSON.stringify(said) === '["[widgetarium] frame side left docked → hidden (toggle)"]',
		{ sides: parts.frameSides.sides(), said },
	);
}

async function checksWidths(check: Check): Promise<void> {
	const clamped = [edgePxWithin("left", 50, 900), edgePxWithin("chat", 900, 700), edgePxWithin("chat", 400.4, 900)];
	check(
		"an edge stays between its least width and the most the frame gives",
		JSON.stringify(clamped) === "[200,700,400]",
		clamped,
	);
	const parts = partsOf();
	parts.frameWidths.saveWidths({ left: 10, chat: 10 }, "a width below the least");
	const answer = await FrameWidthsQuery.handle(undefined, parts);
	check(
		"the widths answer never goes below the least widths and carries the bounds",
		isDeepStrictEqual(widthsWithin({ left: 10, chat: 10 }), { left: 200, chat: 320 }) &&
			answer.left === 200 &&
			answer.chat === 320 &&
			answer.bounds.plateLeastPx === 320 &&
			answer.bounds.chat.usualPx === 560,
		answer,
	);
}

function checksPaneRules(check: Check): void {
	check("a minted leaf takes the next pane number", mintedLeafOf(FIRST_PANES, { kind: "chat" }).id === "pane-1", null);
	check("a board whose target is no app tab has no tab target", tabTargetOf(FIRST_PANES) === null, null);
	const parts = partsOf();
	placeTab(parts, "tab-3", "pane-app");
	const tree = parts.paneTree.tree();
	const kept = treeWithoutGoneTabs(tree, goneTabPanesOf(tree, new Set(["tab-3"])));
	const gone = treeWithoutGoneTabs(tree, goneTabPanesOf(tree, new Set()));
	check(
		"dropping gone tabs keeps held tabs and closes a gone tab's pane beside another app pane",
		kept === tree && JSON.stringify(leavesOf(gone.root).map((leaf) => leaf.id)) === '["pane-chat","pane-app"]',
		gone,
	);
}

function checksRefusals(check: Check): void {
	const parts = partsOf();
	const refusals = [
		refusalOf(() => ShowTabInTargetPaneCommand.handle({ tabId: "tab-1" }, parts)),
		refusalOf(() => PlacePaneCommand.handle({ view: { kind: "chat" }, targetId: "pane-9", side: "left" }, parts)),
		refusalOf(() => ClosePaneCommand.handle({ id: "pane-9" }, parts)),
		refusalOf(() => AimPaneCommand.handle({ id: "pane-9" }, parts)),
		refusalOf(() => ResizePaneSplitCommand.handle({ splitId: "split-9", at: 0, share: 0.5 }, parts)),
		refusalOf(() => ResizePaneSplitCommand.handle({ splitId: "pane-root", at: 1, share: 0.5 }, parts)),
	];
	check(
		"a show with no tab target, a pane or split that is not there and an edge past the last are refused",
		refusals.every((reason) => reason !== null) && isDeepStrictEqual(parts.paneTree.tree(), FIRST_PANES),
		refusals,
	);
	AimPaneCommand.handle({ id: "pane-app" }, parts);
	check(
		"a show into a target pane that shows no tab is refused",
		refusalOf(() => ShowTabInTargetPaneCommand.handle({ tabId: "tab-1" }, parts)) !== null,
		parts.paneTree.tree(),
	);
	placeTab(parts, "tab-3", "pane-app");
	placeTab(parts, "tab-4", "pane-app");
	check(
		"a show of a tab that already stands in another pane is refused",
		refusalOf(() => ShowTabInTargetPaneCommand.handle({ tabId: "tab-3" }, parts)) ===
			"tab tab-3 already stands in pane-1",
		parts.paneTree.tree(),
	);
}

function checksTabPanes(check: Check): void {
	const parts = partsOf();
	CloseShownTabPaneCommand.handle(undefined, parts);
	const closed = shapeOf(parts);
	OpenShownTabPaneCommand.handle(undefined, parts);
	const opened = parts.paneTree.tree();
	OpenShownTabPaneCommand.handle(undefined, parts);
	check(
		"the shown tab pane closes, then opens once beside the chat however often it is asked",
		JSON.stringify(closed) === '["chat"]' &&
			JSON.stringify(shapeOf(parts)) === '["chat","shown"]' &&
			parts.paneTree.tree() === opened,
		[closed, shapeOf(parts)],
	);
	placeTab(parts, "tab-3", "pane-chat");
	placeTab(parts, "tab-4", "pane-chat");
	ClosePanesOfTabsCommand.handle({ tabIds: ["tab-3", "tab-7"] }, parts);
	check(
		"closing the panes of tabs closes only the panes showing them",
		JSON.stringify(shapeOf(parts)) === '["chat","tab-4","shown"]',
		shapeOf(parts),
	);
}

async function checksPreview(check: Check): Promise<void> {
	const parts = partsOf();
	const placement = { view: { kind: "app", tabId: "tab-3" }, targetId: "pane-app", side: "right" } as const;
	const preview = await PlacementPreviewQuery.handle(placement, parts);
	const untouched = isDeepStrictEqual(parts.paneTree.tree(), FIRST_PANES);
	PlacePaneCommand.handle(placement, parts);
	const placed = parts.paneTree.tree();
	check(
		"a placement preview answers the tree the drop saves, names the placed pane and saves nothing",
		untouched && isDeepStrictEqual(preview?.root, placed.root) && preview?.placedId === placed.targetId,
		{ preview, placed },
	);
	check(
		"no placement previews nothing, a drop where the pane already stands previews nothing",
		(await PlacementPreviewQuery.handle(null, parts)) === null &&
			(await PlacementPreviewQuery.handle({ ...placement, targetId: "pane-1" }, parts)) === null,
		null,
	);
}

function checksTabsClient(check: Check): void {
	const parts = partsOf();
	const tabs = new LayoutPaneTabsGateway(
		app()
			.modules(LayoutModule.with({ ...parts }))
			.start(),
	);
	const beforeDrop = tabs.showInTargetPane("tab-1");
	placeTab(parts, "tab-3", "pane-app");
	const shown = tabs.showInTargetPane("tab-5");
	const inPanes = tabs.tabIdsInPanes();
	tabs.closePanesOf(["tab-5"]);
	check(
		"the pane tabs client shows a tab in the target pane only when it shows one, through layout's commands",
		!beforeDrop && shown && JSON.stringify(inPanes) === '["tab-5"]' && tabs.tabIdsInPanes().length === 0,
		{ beforeDrop, shown, inPanes, after: tabs.tabIdsInPanes() },
	);
	const layoutApp = app()
		.modules(LayoutModule.with({ ...parts }))
		.start();
	placeTab(parts, "tab-8", "pane-app");
	void layoutApp.send(DropGoneTabsCommand, { heldTabIds: [] });
	check(
		"a layout command sent through the app has saved before send returns",
		!JSON.stringify(shapeOf(parts)).includes("tab-8"),
		shapeOf(parts),
	);
}

export async function checksLayoutRules(check: Check): Promise<void> {
	const quiet = console.info;
	console.info = () => undefined;
	checksSideLooks(check);
	await checksWidths(check);
	checksPaneRules(check);
	checksRefusals(check);
	checksTabPanes(check);
	await checksPreview(check);
	checksTabsClient(check);
	console.info = quiet;
}
