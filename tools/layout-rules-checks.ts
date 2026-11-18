import { isDeepStrictEqual } from "node:util";
import { layoutPartsOf } from "../packages/state/layout/gateways/layout-parts/memory.gateway.ts";
import type { LayoutMemories } from "../packages/state/layout/gateways/layout-parts/memory.gateway.ts";
import type { LayoutParts } from "../packages/state/layout/gateways/layout-parts/layout-parts.gateway.ts";
import {
	concealedLook,
	peekedLook,
	refuseTurn,
	toggledLook,
} from "../plugins/tabs/navigation/data/app-host/features/frame-sides/lib/side-looks.ts";
import { appHost } from "../plugins/tabs/navigation/data/app-host/generated/contract.ts";
import { frameWidths } from "../packages/state/layout/features/frame-widths/requests.ts";
import { leavesOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/panes/pane-nodes.ts";
import { FIRST_PANES } from "../plugins/tabs/navigation/data/navigation/shared/lib/panes/kept-panes.ts";
import { keptPanesOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/panes/kept-panes.ts";
import {
	goneTabPanesOf,
	mintedLeafOf,
	tabTargetOf,
	treeWithoutGoneTabs,
} from "../plugins/tabs/navigation/data/navigation/shared/lib/panes/pane-trees.ts";
import {
	aim,
	close,
	closeShowingPanes,
	closeShown,
	openShown,
	place,
	placementPreview,
	resizeSplit,
	showInTarget,
} from "../plugins/tabs/navigation/data/navigation/features/panes/requests.ts";
import { edgePxWithin, widthsWithin } from "../packages/state/layout/shared/lib/frame-bounds.ts";
import { infosOf, panePartsOf, refusalOf, shapeOf, treeOf } from "./pane-harness.ts";
import type { PaneParts } from "./pane-harness.ts";
import { studioFakesOf } from "./app-host-fixture.ts";

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

export function memoriesOf(): LayoutMemories {
	return {
		widths: {
			left: memoryOf<number>(),
			chat: memoryOf<number>(),
		},
	};
}

export function partsOf(): LayoutParts {
	return layoutPartsOf(memoriesOf());
}

async function placeTab(parts: PaneParts, tabId: string, targetId: string): Promise<void> {
	await place.handle({ seat: parts.seat, placement: { view: { kind: "app", tabId }, targetId, side: "right" } }, parts);
}

async function checksSideLooks(check: Check): Promise<void> {
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
	const { studioApp, places, appHost: fakes } = studioFakesOf();
	const said = await infosOf(() => studioApp.send(appHost.frameSides.toggle, { side: "left" }));
	const sides = await studioApp.send(appHost.frameSides.frameSides);
	const kept = (await places.placedTabs()).views[fakes.studioWindow.placesWindow()]?.leftHidden;
	const turns = said.filter((line) => line === "[widgetarium] frame side left docked → hidden (toggle)");
	check(
		"a toggle saves the hidden side in the window's navigation view and logs the turn once as was → now",
		sides.ok && sides.output.left === "hidden" && kept === true && turns.length === 1,
		{ sides, kept, said },
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
	const answer = await frameWidths.handle(undefined, parts);
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

async function checksPaneRules(check: Check): Promise<void> {
	check("a minted leaf takes the next pane number", mintedLeafOf(FIRST_PANES, { kind: "chat" }).id === "pane-1", null);
	check("a board whose target is no app tab has no tab target", tabTargetOf(FIRST_PANES) === null, null);
	const parts = panePartsOf();
	await placeTab(parts, "tab-3", "pane-app");
	const tree = await treeOf(parts);
	const kept = treeWithoutGoneTabs(tree, goneTabPanesOf(tree, new Set(["tab-3"])));
	const gone = treeWithoutGoneTabs(tree, goneTabPanesOf(tree, new Set()));
	check(
		"dropping gone tabs keeps held tabs and closes a gone tab's pane beside another app pane",
		kept === tree && JSON.stringify(leavesOf(gone.root).map((leaf) => leaf.id)) === '["pane-chat","pane-app"]',
		gone,
	);
}

async function checksRefusals(check: Check): Promise<void> {
	const parts = panePartsOf();
	const { seat } = parts;
	const refusals = [
		await refusalOf(() => showInTarget.handle({ seat, tabId: "tab-1" }, parts)),
		await refusalOf(() =>
			place.handle({ seat, placement: { view: { kind: "chat" }, targetId: "pane-9", side: "left" } }, parts),
		),
		await refusalOf(() => close.handle({ seat, id: "pane-9" }, parts)),
		await refusalOf(() => aim.handle({ seat, id: "pane-9" }, parts)),
		await refusalOf(() => resizeSplit.handle({ seat, splitId: "split-9", at: 0, share: 0.5 }, parts)),
		await refusalOf(() => resizeSplit.handle({ seat, splitId: "pane-root", at: 1, share: 0.5 }, parts)),
	];
	check(
		"a show with no tab target, a pane or split that is not there and an edge past the last are refused",
		refusals.every((reason) => reason !== null) && isDeepStrictEqual(await treeOf(parts), FIRST_PANES),
		refusals,
	);
	await aim.handle({ seat, id: "pane-app" }, parts);
	check(
		"a show into a target pane that shows no tab is refused",
		(await refusalOf(() => showInTarget.handle({ seat, tabId: "tab-1" }, parts))) !== null,
		await treeOf(parts),
	);
	await placeTab(parts, "tab-3", "pane-app");
	await placeTab(parts, "tab-4", "pane-app");
	check(
		"a show of a tab that already stands in another pane is refused",
		(await refusalOf(() => showInTarget.handle({ seat, tabId: "tab-3" }, parts))) === "tab tab-3 already stands in pane-1",
		await treeOf(parts),
	);
}

async function checksTabPanes(check: Check): Promise<void> {
	const parts = panePartsOf();
	const { seat } = parts;
	await closeShown.handle({ seat }, parts);
	const closed = await shapeOf(parts);
	await openShown.handle({ seat }, parts);
	const opened = await treeOf(parts);
	await openShown.handle({ seat }, parts);
	check(
		"the shown tab pane closes, then takes the whole board once however often it is asked",
		JSON.stringify(closed) === '["chat"]' &&
			JSON.stringify(await shapeOf(parts)) === '["shown"]' &&
			isDeepStrictEqual(await treeOf(parts), opened),
		[closed, await shapeOf(parts)],
	);
	await placeTab(parts, "tab-3", "pane-chat");
	await placeTab(parts, "tab-4", "pane-chat");
	await closeShowingPanes.handle({ seat, tabIds: ["tab-3", "tab-7"] }, parts);
	check(
		"closing the panes of tabs closes only the panes showing them",
		JSON.stringify(await shapeOf(parts)) === '["chat","tab-4","shown"]',
		await shapeOf(parts),
	);
}

async function checksPreview(check: Check): Promise<void> {
	const parts = panePartsOf();
	const { seat } = parts;
	const placement = { view: { kind: "app", tabId: "tab-3" }, targetId: "pane-app", side: "right" } as const;
	const preview = await placementPreview.handle({ seat, placement }, parts);
	const untouched = isDeepStrictEqual(await treeOf(parts), FIRST_PANES);
	await place.handle({ seat, placement }, parts);
	const placed = await treeOf(parts);
	check(
		"a placement preview answers the tree the drop saves, names the placed pane and saves nothing",
		untouched && isDeepStrictEqual(preview?.root, placed.root) && preview?.placedId === placed.targetId,
		{ preview, placed },
	);
	const standing = leavesOf(placed.root).find((leaf) => leaf.view.kind === "app" && leaf.view.tabId === "tab-3");
	const onItself =
		standing === undefined
			? null
			: await placementPreview.handle({ seat, placement: { ...placement, targetId: standing.id } }, parts);
	check(
		"no placement previews nothing, and a drop where the pane already stands previews the tree unchanged with that pane placed",
		(await placementPreview.handle({ seat, placement: null }, parts)) === null &&
			onItself !== null &&
			isDeepStrictEqual(onItself.root, placed.root) &&
			onItself.placedId === standing?.id,
		onItself,
	);
}

async function checksSendSaves(check: Check): Promise<void> {
	const tree = {
		...FIRST_PANES,
		root: {
			kind: "split",
			id: "pane-root",
			dir: "row",
			shares: [0.5, 0.5],
			children: [
				{ kind: "pane", id: "pane-chat", view: { kind: "chat" } },
				{ kind: "pane", id: "pane-app", view: { kind: "app", tabId: null } },
				{ kind: "pane", id: "pane-1", view: { kind: "app", tabId: "tab-8" } },
			],
		},
		minted: 1,
	} as const;
	const { studioApp, places, appHost: fakes } = studioFakesOf({ tree: { ...tree, root: { ...tree.root, shares: [0.4, 0.3, 0.3] } } });
	await studioApp.send(appHost.paneTabs.dropGoneTabs, { heldTabIds: [] });
	const kept = keptPanesOf((await places.placedTabs()).views[fakes.studioWindow.placesWindow()]?.panes);
	const shape = leavesOf(kept?.root ?? null).map((leaf) => leaf.id);
	check(
		"a pane command sent through the window has saved the window's panes in navigation when send answers",
		kept !== null && !shape.includes("pane-1"),
		shape,
	);
}

export async function checksLayoutRules(check: Check): Promise<void> {
	const quiet = console.info;
	console.info = () => undefined;
	await checksSideLooks(check);
	await checksWidths(check);
	await checksPaneRules(check);
	await checksRefusals(check);
	await checksTabPanes(check);
	await checksPreview(check);
	await checksSendSaves(check);
	console.info = quiet;
}
