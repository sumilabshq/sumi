import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import { checksLayoutRules, infosOf, memoriesOf, memoryOf, partsOf, shapeOf } from "./layout-rules-checks.ts";
import { leavesOf } from "../packages/state/layout/shared/lib/pane-nodes.ts";
import { paneLayoutOf, sideAt } from "../apps/studio/src/features/panes/lib/pane-layout.ts";
import { FIRST_PANES, layoutPartsOf } from "../packages/state/layout/gateways/layout-parts/memory.gateway.ts";
import type { LayoutMemories } from "../packages/state/layout/gateways/layout-parts/memory.gateway.ts";
import type { LayoutParts } from "../packages/state/layout/gateways/layout-parts/layout-parts.gateway.ts";
import {
	AimPaneCommand,
	ClosePaneCommand,
	PlacePaneCommand,
	ResizePaneSplitCommand,
} from "../packages/state/layout/features/panes/requests.ts";
import {
	DropGoneTabsCommand,
	ShowTabInTargetPaneCommand,
} from "../packages/state/layout/features/pane-tabs/requests.ts";
import {
	PeekFrameSideCommand,
	ToggleFrameSideCommand,
} from "../packages/state/layout/features/frame-sides/requests.ts";
import { ResizeFrameEdgeCommand } from "../packages/state/layout/features/frame-widths/requests.ts";
import type { PaneSide, PaneTree, PaneView } from "../packages/state/layout/shared/schema/pane-tree.schema.ts";
import { emptyMoment, openTab } from "../packages/state/places/shared/lib/tabs/host-tabs.ts";
import { WORKSPACE_LIST } from "../packages/state/places/shared/lib/tabs/tab-lists.ts";
import { sidebarOf } from "../packages/state/places/shared/lib/rows/sidebar-rows.ts";
import { BROWSER_SHEET_SOURCES } from "./sheet-paths.mts";

let failed = 0;
const quiet = console.info;
const SPACING = {
	gapPx: 8,
	leastPx: 320,
};

function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) {
		failed += 1;
	}

	console.log(`${isOk ? "ok  " : "FAIL"} ${what}${isOk ? "" : ` — ${JSON.stringify(got)}`}`);
}

function place(
	parts: LayoutParts,
	view: PaneView,
	at: { readonly targetId: string | null; readonly side: PaneSide },
): void {
	PlacePaneCommand.handle({ view, ...at }, parts);
}

function closeAll(parts: LayoutParts): void {
	leavesOf(parts.paneTree.tree().root).forEach((leaf) => ClosePaneCommand.handle({ id: leaf.id }, parts));
}

function resize(parts: LayoutParts, share: number): void {
	ResizePaneSplitCommand.handle({ splitId: "pane-root", at: 0, share }, parts);
}

function checksTree(): void {
	console.info = () => undefined;
	const parts = partsOf();
	place(parts, { kind: "app", tabId: "tab-3" }, { targetId: "pane-app", side: "right" });
	check(
		"a tab dropped on the right of the app pane stands after it",
		JSON.stringify(shapeOf(parts)) === '["chat","shown","tab-3"]',
		shapeOf(parts),
	);
	place(parts, { kind: "app", tabId: "tab-3" }, { targetId: "pane-chat", side: "left" });
	check(
		"placing a tab that already stands moves it, never copies it",
		JSON.stringify(shapeOf(parts)) === '["tab-3","chat","shown"]',
		shapeOf(parts),
	);
	place(parts, { kind: "app", tabId: "tab-4" }, { targetId: "pane-app", side: "bottom" });
	const root = parts.paneTree.tree().root;
	check(
		"a drop on the bottom edge wraps the pane in a column",
		root?.kind === "split" && JSON.stringify(root.children.map((child) => child.kind)) === '["pane","pane","split"]',
		root,
	);
	closeAll(parts);
	check("closing every pane leaves an empty board", parts.paneTree.tree().root === null, parts.paneTree.tree().root);
	place(parts, { kind: "chat" }, { targetId: null, side: "right" });
	check(
		"a pane placed on an empty board is the whole board",
		parts.paneTree.tree().root?.kind === "pane",
		parts.paneTree.tree().root,
	);
	const workspaceEnd = { chatId: WORKSPACE_LIST, groupId: null, before: null };
	const oneTab = openTab(emptyMoment(), { app: "browser", pageId: null }, workspaceEnd).moment;
	const twoTabs = openTab(oneTab, { app: "browser", pageId: null }, workspaceEnd).moment;
	const sidebar = sidebarOf({
		moment: twoTabs,
		essentials: [],
		pages: [],
		shownApp: null,
		shownTileRowId: null,
		hasShownTabPane: true,
		elsewhere: [],
	});
	const rows =
		sidebar.sections[1]?.entries.flatMap((entry) =>
			entry.kind === "tab" ? [[entry.tab.id, entry.tab.isShown]] : [],
		) ?? [];
	check(
		"a tab standing in a pane is not marked shown: only what fills the screen is",
		JSON.stringify(rows) === '[["tab-1",false],["tab-2",false]]',
		rows,
	);
	checksShares();
	checksTarget();
	console.info = quiet;
	const halves = paneLayoutOf(FIRST_PANES.root, { left: 0, top: 0, width: 1008, height: 800 }, SPACING).rects;
	check(
		"the first two panes share the board in halves",
		halves.get("pane-chat")?.width === 500 && halves.get("pane-app")?.width === 500,
		[...halves],
	);
	const narrow = paneLayoutOf(
		{
			...FIRST_PANES.root,
			kind: "split",
			id: "root",
			dir: "row",
			children: FIRST_PANES.root?.kind === "split" ? FIRST_PANES.root.children : [],
			shares: [0.9, 0.1],
		},
		{ left: 0, top: 0, width: 1008, height: 800 },
		SPACING,
	).rects;
	check("a pane never gets less than 320 while the board has room", narrow.get("pane-app")?.width === 320, [...narrow]);
	const pane = { left: 0, top: 0, width: 400, height: 400 };
	const sides = [
		sideAt(pane, 20, 200),
		sideAt(pane, 390, 200),
		sideAt(pane, 200, 10),
		sideAt(pane, 200, 395),
		sideAt(pane, 230, 200),
	];
	check(
		"the pointer's nearest edge picks the side, even in the middle: a pane never lands on a pane",
		JSON.stringify(sides) === '["left","right","top","bottom","right"]',
		sides,
	);
}

function sharesOf(parts: LayoutParts): readonly number[] {
	const root = parts.paneTree.tree().root;
	return root?.kind === "split" ? root.shares.map((share) => Math.round(share * 1000) / 1000) : [];
}

function checksTarget(): void {
	const parts = partsOf();
	place(parts, { kind: "app", tabId: "tab-3" }, { targetId: "pane-app", side: "right" });
	const afterDrop = parts.paneTree.tree().targetId;
	AimPaneCommand.handle({ id: "pane-chat" }, parts);
	const afterChat = parts.paneTree.tree().targetId;
	AimPaneCommand.handle({ id: "pane-app" }, parts);
	const afterApp = parts.paneTree.tree().targetId;
	AimPaneCommand.handle({ id: "pane-1" }, parts);
	ShowTabInTargetPaneCommand.handle({ tabId: "tab-9" }, parts);
	const shownIn = leavesOf(parts.paneTree.tree().root).find((leaf) => leaf.id === "pane-1")?.view;
	ClosePaneCommand.handle({ id: "pane-1" }, parts);
	check(
		"a dropped tab's pane becomes the target, the chat never does, a press aims a pane, and showing replaces the target's tab",
		afterDrop === "pane-1" &&
			afterChat === "pane-1" &&
			afterApp === "pane-app" &&
			JSON.stringify(shownIn) === '{"kind":"app","tabId":"tab-9"}' &&
			parts.paneTree.tree().targetId === null,
		[afterDrop, afterChat, afterApp, shownIn, parts.paneTree.tree().targetId],
	);
}

function checksShares(): void {
	const even = partsOf();
	place(even, { kind: "app", tabId: "tab-3" }, { targetId: "pane-chat", side: "right" });
	check(
		"a pane dropped between halves gives every pane a third",
		JSON.stringify(sharesOf(even)) === "[0.333,0.333,0.333]",
		sharesOf(even),
	);
	const uneven = partsOf();
	resize(uneven, 2 / 3);
	place(uneven, { kind: "app", tabId: "tab-3" }, { targetId: "pane-chat", side: "right" });
	check(
		"a new pane takes a third and the others shrink in proportion",
		JSON.stringify(sharesOf(uneven)) === "[0.444,0.333,0.222]",
		sharesOf(uneven),
	);
	ClosePaneCommand.handle({ id: "pane-1" }, uneven);
	check(
		"closing a pane gives its share back in proportion",
		JSON.stringify(sharesOf(uneven)) === "[0.667,0.333]",
		sharesOf(uneven),
	);
	const nested = partsOf();
	place(nested, { kind: "app", tabId: "tab-3" }, { targetId: "pane-app", side: "bottom" });
	place(nested, { kind: "app", tabId: "tab-4" }, { targetId: "pane-1", side: "right" });
	ClosePaneCommand.handle({ id: "pane-app" }, nested);
	check(
		"a split left alone in a split of its direction folds into it",
		JSON.stringify(shapeOf(nested)) === '["chat","tab-3","tab-4"]' && sharesOf(nested).length === 3,
		[shapeOf(nested), sharesOf(nested)],
	);
}

const CARRY = `((phase, x, y) => { const detail = { phase, item: { kind: "tab", id: "tab-9", title: "Docs" }, x, y, isTaken: false }; document.dispatchEvent(new CustomEvent("wg-carry", { detail })); return detail.isTaken; })`;
const PANES = `[...document.querySelectorAll("[data-pane-id]")].map((pane) => [pane.dataset.paneId, Math.round(pane.getBoundingClientRect().width)])`;

function checksKept(): void {
	console.info = () => undefined;
	const panes = memoryOf<unknown>();
	const memories = memoriesOf(panes);
	const first = layoutPartsOf(memories);
	place(first, { kind: "app", tabId: "tab-3" }, { targetId: "pane-app", side: "right" });
	resize(first, 0.25);
	const again = layoutPartsOf(memories).paneTree.tree();
	check(
		"a restart draws the panes as they were left: the same tree, the same shares",
		isDeepStrictEqual(again, first.paneTree.tree()),
		again,
	);
	panes.write({ root: "torn" });
	let refused: PaneTree | null = null;
	warnsOf(() => {
		refused = layoutPartsOf(memories).paneTree.tree();
	});
	check("a kept tree the schema refuses starts from the first panes", isDeepStrictEqual(refused, FIRST_PANES), refused);
	console.info = quiet;
}

const BROKEN_TREES: readonly (readonly [string, unknown])[] = [
	["shares that do not match the children", { ...FIRST_PANES, root: { ...FIRST_PANES.root, shares: [1] } }],
	[
		"a split of one child",
		{
			...FIRST_PANES,
			root: {
				kind: "split",
				id: "pane-root",
				dir: "row",
				shares: [1],
				children: [{ kind: "pane", id: "pane-chat", view: { kind: "chat" } }],
			},
		},
	],
	["shares summing to nothing", { ...FIRST_PANES, root: { ...FIRST_PANES.root, shares: [0, 0] } }],
	[
		"an id standing twice",
		{
			...FIRST_PANES,
			root: {
				...FIRST_PANES.root,
				children: [
					{ kind: "pane", id: "pane-chat", view: { kind: "chat" } },
					{ kind: "pane", id: "pane-chat", view: { kind: "app", tabId: null } },
				],
			},
		},
	],
	[
		"minted below a held pane-N",
		{
			...FIRST_PANES,
			root: {
				...FIRST_PANES.root,
				children: [
					{ kind: "pane", id: "pane-chat", view: { kind: "chat" } },
					{ kind: "pane", id: "pane-4", view: { kind: "app", tabId: "tab-1" } },
				],
			},
			minted: 2,
		},
	],
	["a target naming no pane", { ...FIRST_PANES, targetId: "pane-9" }],
];

function warnsOf(run: () => void): unknown[][] {
	const said: unknown[][] = [];
	const wasWarn = console.warn;
	console.warn = (...args: unknown[]) => {
		said.push(args);
	};
	run();
	console.warn = wasWarn;
	return said;
}

function checksKeptRefusals(): void {
	console.info = () => undefined;

	for (const [what, tree] of BROKEN_TREES) {
		const panes = memoryOf<unknown>();
		panes.write(tree);
		let started: PaneTree | null = null;
		const warned = warnsOf(() => {
			started = layoutPartsOf(memoriesOf(panes)).paneTree.tree();
		});
		check(
			`a kept tree with ${what} starts from the first panes and says why`,
			isDeepStrictEqual(started, FIRST_PANES) && warned.length === 1,
			{ started, warned },
		);
	}

	const torn = memoryOf<unknown>();
	const unreadable = { read: () => JSON.parse("{torn"), write: torn.write };
	const unread = warnsOf(() => layoutPartsOf(memoriesOf(unreadable)));
	check("kept panes that are not JSON warn with the parse error", unread[0]?.[1] instanceof SyntaxError, unread);
	console.info = quiet;
}

function checksGoneTabs(): void {
	console.info = () => undefined;
	const beside = partsOf();
	place(beside, { kind: "app", tabId: "tab-3" }, { targetId: "pane-app", side: "right" });
	DropGoneTabsCommand.handle({ heldTabIds: [] }, beside);
	check(
		"a pane whose kept tab the host no longer holds is closed",
		JSON.stringify(shapeOf(beside)) === '["chat","shown"]',
		shapeOf(beside),
	);

	const alone = partsOf();
	AimPaneCommand.handle({ id: "pane-app" }, alone);
	alone.paneTree.saveTree(
		{
			...alone.paneTree.tree(),
			root: {
				kind: "split",
				id: "pane-root",
				dir: "row",
				shares: [0.5, 0.5],
				children: [
					{ kind: "pane", id: "pane-chat", view: { kind: "chat" } },
					{ kind: "pane", id: "pane-app", view: { kind: "app", tabId: "tab-5" } },
				],
			},
		},
		"a kept tab in the only app pane",
	);
	const said = infosOf(() => DropGoneTabsCommand.handle({ heldTabIds: ["tab-1"] }, alone));
	check(
		"the only app pane keeps its place and shows no tab, logged as one transition",
		JSON.stringify(shapeOf(alone)) === '["chat","shown"]' &&
			said.length === 1 &&
			said[0]?.endsWith("(kept tab tab-5 is gone)") === true,
		{ shape: shapeOf(alone), said },
	);

	const held = partsOf();
	place(held, { kind: "app", tabId: "tab-5" }, { targetId: "pane-app", side: "right" });
	const before = held.paneTree.tree();
	DropGoneTabsCommand.handle({ heldTabIds: ["tab-5"] }, held);
	check("a pane whose tab the host holds is left alone", held.paneTree.tree() === before, shapeOf(held));
	console.info = quiet;
}

function checksGatewaysKeep(): void {
	console.info = () => undefined;
	const reasons: string[] = [];
	const memories: LayoutMemories = {
		...memoriesOf(),
		panes: { read: () => null, write: (_tree, reason) => reasons.push(reason) },
	};
	const parts = layoutPartsOf(memories);
	ToggleFrameSideCommand.handle({ side: "left" }, parts);
	ResizeFrameEdgeCommand.handle({ edge: "chat", px: 640, mostPx: 2000 }, parts);
	const resized = infosOf(() => resize(parts, 0.25));
	check(
		"each gateway keeps its own transitions: the hidden side, the width, the pane tree with its reason",
		memories.sides.left.read() === true &&
			memories.widths.chat.read() === 640 &&
			JSON.stringify(reasons) === '["split pane-root edge 0 0.500 → 0.250 (drag)"]',
		{ left: memories.sides.left.read(), chat: memories.widths.chat.read(), reasons },
	);
	check("a pane resize stays quiet in the console", resized.length === 0, resized);
	PeekFrameSideCommand.handle({ side: "left" }, parts);
	check(
		"a peek keeps the side hidden between starts",
		parts.frameSides.sides().left === "peeking" && memories.sides.left.read() === true,
		memories.sides.left.read(),
	);
	console.info = quiet;
}

async function pageOf(folder: string): Promise<AskedPage> {
	const bundle = await bundleOf("tools/shell-frame-page.tsx");
	const sheets = BROWSER_SHEET_SOURCES.map((at) => readFileSync(at, "utf8")).join("\n");
	const file = path.join(folder, "pane-board.html");
	writeFileSync(
		file,
		`<!doctype html><html><head><meta charset="utf-8"><style>${sheets}</style><style>html,body,#root{height:100%;margin:0}</style></head><body><div id="root"></div><pre id="boom"></pre><script>if (sessionStorage.getItem("wg-pane-board") === null) { localStorage.clear(); sessionStorage.setItem("wg-pane-board", "1"); }</script><script>${bundle.replaceAll("</script", "<\\/script")}</script></body></html>`,
	);
	const page = await paged(file, "test:pane-board", { size: [1440, 900] });
	await waited(1500);
	return page;
}

async function centreRightOf(page: AskedPage, paneId: string): Promise<readonly [number, number]> {
	const point = await page.ask(
		`(() => { const box = document.querySelector('[data-pane-id="${paneId}"]').getBoundingClientRect(); return [box.right - 20, box.top + box.height / 2]; })()`,
	);
	return Array.isArray(point) ? [Number(point[0]), Number(point[1])] : [0, 0];
}

const BOARD_GROWN_PX = 200;
const BOARD_CHAIN = `(() => { const chain = []; let node = document.querySelector(".wg-pane-board"); while (node !== null && node !== document.documentElement) { chain.push(node); node = node.parentElement; } return chain; })()`;
const PANE_AND_BOARD_HEIGHTS = `[document.querySelector(".wg-pane-board").clientHeight, ...[...document.querySelectorAll("[data-pane-id]")].map((pane) => Math.round(pane.getBoundingClientRect().height))]`;

async function checksPanesFollowBoardAfterDrag(page: AskedPage): Promise<void> {
	await page.ask(
		`(() => { const grown = document.querySelector(".wg-pane-board").clientHeight + ${BOARD_GROWN_PX}; for (const node of ${BOARD_CHAIN}) { node.style.height = grown + "px"; } return true; })()`,
	);
	await waited(400);
	const heights = await page.ask(PANE_AND_BOARD_HEIGHTS);
	await page.ask(`(() => { for (const node of ${BOARD_CHAIN}) { node.style.height = ""; } return true; })()`);
	await waited(400);
	const [boardPx, ...panePx] = Array.isArray(heights) ? heights.map(Number) : [];
	check(
		"after an edge drag every pane still follows the board when it grows",
		panePx.length > 0 && panePx.every((px) => Math.abs(px - (boardPx ?? 0)) <= 1),
		heights,
	);
}

async function checksEdgeDrag(page: AskedPage): Promise<void> {
	const edge = await page.ask(
		`(() => { const box = document.querySelector("[data-pane-edge]").getBoundingClientRect(); return [box.left + box.width / 2, box.top + box.height / 2]; })()`,
	);
	const [x, y] = Array.isArray(edge) ? [Number(edge[0]), Number(edge[1])] : [0, 0];
	const widthOf = `Math.round(document.querySelector('[data-pane-id="pane-chat"]').getBoundingClientRect().width)`;
	const before = Number(await page.ask(widthOf));
	await page.drag({
		from: [x, y],
		to: [x + 120, y],
		steps: 6,
		stepMs: 16,
	});
	await page.release([x + 120, y]);
	await waited(400);
	const after = Number(await page.ask(widthOf));
	const boardPx = Number(await page.ask(`document.querySelector(".wg-pane-board").clientWidth`));
	const wanted = Math.min(before + 120, boardPx - 8 - 320);
	check(
		"dragging the edge moves it under the pointer until the other pane reaches 320",
		Math.abs(after - wanted) <= 2,
		{
			before,
			after,
			wanted,
		},
	);
	await checksPanesFollowBoardAfterDrag(page);
	await page.ask(
		`document.querySelector("[data-pane-edge]").dispatchEvent(new MouseEvent("dblclick", { bubbles: true })); true`,
	);
	await waited(400);
	const reset = Number(await page.ask(widthOf));
	check("a double press on the chat edge puts the chat back to its usual width", Math.abs(reset - before) <= 2, {
		before,
		reset,
	});
}

const ORDER = `[...document.querySelectorAll("[data-pane-id]")].sort((one, other) => one.getBoundingClientRect().left - other.getBoundingClientRect().left).map((pane) => pane.dataset.paneId)`;
const TOGGLES = `[...document.querySelectorAll(".wg-plate-head[data-at-top-right]")].map((head) => head.closest("[data-pane-id]")?.dataset.paneId ?? "outside")`;

async function checksHeaderMove(page: AskedPage): Promise<void> {
	const before = await page.ask(ORDER);
	const togglesBefore = await page.ask(TOGGLES);
	const from = await page.ask(
		`(() => { const box = document.querySelector('[data-pane-handle="pane-chat"]').getBoundingClientRect(); return [box.left + box.width / 2, box.top + box.height / 2]; })()`,
	);
	const [fromX, fromY] = Array.isArray(from) ? [Number(from[0]), Number(from[1])] : [0, 0];
	const [toX, toY] = await centreRightOf(page, "pane-app");
	await page.drag({ from: [fromX, fromY], to: [toX, toY], steps: 10, stepMs: 16 });
	await waited(300);
	const preview = await page.ask(`document.querySelector(".wg-pane-preview") !== null`);
	await page.release([toX, toY]);
	await waited(400);
	const after = await page.ask(ORDER);
	check(
		"dragging a pane by its header previews and moves it to the side it was dropped on",
		preview === true && JSON.stringify(after) === '["pane-app","pane-chat"]',
		{
			before,
			preview,
			after,
		},
	);
	check(
		"only the top-right pane keeps room for the tabs toggle, before and after the move",
		JSON.stringify(togglesBefore) === '["pane-app"]' && JSON.stringify(await page.ask(TOGGLES)) === '["pane-chat"]',
		[togglesBefore, await page.ask(TOGGLES)],
	);
	await page.drag({ from: [toX - 300, fromY], to: [8, toY], steps: 10, stepMs: 16 });
	await page.release([8, toY]);
	await waited(400);
}

async function checksBoard(folder: string): Promise<void> {
	const page = await pageOf(folder);
	await checksEdgeDrag(page);
	await checksHeaderMove(page);
	const before = await page.ask(PANES);
	const [x, y] = await centreRightOf(page, "pane-app");
	const taken = await page.ask(`${CARRY}("over", ${x}, ${y})`);
	await waited(400);
	const during = await page.ask(PANES);
	const preview = await page.ask(`document.querySelector(".wg-pane-preview") !== null`);
	writeFileSync(path.join(folder, "pane-preview.png"), await page.shoot());
	check(
		"a tab carried over the right edge of the app pane is taken and previewed",
		taken === true && preview === true,
		{ taken, preview },
	);
	check("the app pane shrinks to make room before the drop", JSON.stringify(during) !== JSON.stringify(before), [
		before,
		during,
	]);
	await page.ask(`${CARRY}("drop", ${x}, ${y})`);
	await waited(400);
	const after = (await page.ask(PANES)) as unknown[];
	check(
		"the drop makes a third pane and the preview leaves",
		after.length === 3 && (await page.ask(`document.querySelector(".wg-pane-preview") === null`)) === true,
		after,
	);
	const dimmed = await page.ask(
		`[...document.querySelectorAll("[data-pane-dimmed]")].map((pane) => pane.dataset.paneId)`,
	);
	await page.ask(
		`document.querySelector('[data-pane-id="pane-app"]').dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); true`,
	);
	await waited(200);
	const dimmedAfterPress = await page.ask(
		`[...document.querySelectorAll("[data-pane-dimmed]")].map((pane) => pane.dataset.paneId)`,
	);
	check(
		"the pane a tab was dropped into is the target and the other app pane dims; a press moves the target",
		JSON.stringify(dimmed) === '["pane-app"]' && JSON.stringify(dimmedAfterPress) === '["pane-1"]',
		[dimmed, dimmedAfterPress],
	);
	const keptAsPreviewed = after.filter((pane) => JSON.stringify(during).includes(JSON.stringify(pane)));
	check(
		"the preview shows the panes exactly as the drop leaves them",
		JSON.stringify(keptAsPreviewed) === JSON.stringify(during),
		{ during, after },
	);
	writeFileSync(path.join(folder, "pane-dropped.png"), await page.shoot());
	await page.ask(`location.reload(); true`);
	await waited(1500);
	const reloaded = (await page.ask(PANES)) as unknown[];
	const idsOf = (panes: readonly unknown[]): readonly unknown[] =>
		panes.map((pane) => (Array.isArray(pane) ? pane[0] : null));
	check(
		"a web reload keeps the pane tree but closes the pane whose tab the host no longer holds",
		reloaded.length === after.length - 1 && idsOf(reloaded).includes("pane-app") && !idsOf(reloaded).includes("pane-1"),
		[after, reloaded],
	);
	const outside = await page.ask(`${CARRY}("over", 5, 5)`);
	check("a carry outside the board is not taken", outside === false, outside);
	await page.ask(`${CARRY}("leave", 5, 5)`);

	for (const _pane of [...reloaded, "spare"]) {
		await page.ask(`document.querySelector("[data-pane-close]")?.click(); true`);
		await waited(250);
	}

	check(
		"closing every pane shows the empty board",
		(await page.ask(`document.querySelector("[data-pane-empty]") !== null`)) === true,
		await page.ask(PANES),
	);
	await page.ask(`document.querySelector('[data-pane-open="chat"]').click(); true`);
	await waited(300);
	check(
		"Open chat brings the chat back as the whole board",
		JSON.stringify(
			await page.ask(`[...document.querySelectorAll("[data-pane-id]")].map((pane) => pane.dataset.paneView)`),
		) === '["chat"]',
		await page.ask(PANES),
	);
	page.close();
}

const folder = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-pane-board"));
mkdirSync(folder, { recursive: true });
checksTree();
checksKept();
checksKeptRefusals();
checksGoneTabs();
checksGatewaysKeep();
await checksLayoutRules(check);
await checksBoard(folder);
console.log(failed === 0 ? "pane board: all checks pass" : `pane board: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
