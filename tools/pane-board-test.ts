import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import { PaneTreeStore } from "../packages/layout/shared/lib/pane-tree-store.ts";
import { leavesOf } from "../packages/layout/shared/lib/pane-tree.ts";
import { paneLayoutOf, sideAt } from "../packages/shell/shared/lib/pane-layout.ts";
import { FIRST_PANES, layoutPartsOf } from "../packages/layout/gateways/layout-parts/layout-parts.gateway.ts";
import type { LayoutMemories } from "../packages/layout/gateways/layout-parts/layout-parts.gateway.ts";
import type { PaneTree } from "../packages/layout/shared/schema/pane-tree.schema.ts";
import { HostTabs } from "../packages/app-host/shared/lib/host-tabs/host-tabs.ts";
import { WORKSPACE_LIST } from "../packages/app-host/shared/lib/host-tabs/tab-lists.ts";
import { sidebarOf } from "../packages/app-host/features/tabs/lib/tab-rows.ts";

let failed = 0;
const quiet = console.info;
const KEEP_NOTHING = (): void => undefined;

interface Memory<T> {
	read(): T | null;
	write(value: T): void;
}

function memoryOf<T>(): Memory<T> {
	let kept: string | null = null;
	return {
		read: () => (kept === null ? null : JSON.parse(kept)),
		write: (value) => {
			kept = JSON.stringify(value);
		},
	};
}

function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) {
		failed += 1;
	}

	console.log(`${isOk ? "ok  " : "FAIL"} ${what}${isOk ? "" : ` — ${JSON.stringify(got)}`}`);
}

function shapeOf(store: PaneTreeStore): readonly string[] {
	return leavesOf(store.now().root).map((leaf) => (leaf.view.kind === "chat" ? "chat" : (leaf.view.tabId ?? "shown")));
}

function checksTree(): void {
	console.info = () => undefined;
	const store = new PaneTreeStore(FIRST_PANES, KEEP_NOTHING);
	store.place({ kind: "app", tabId: "tab-3" }, { targetId: "pane-app", side: "right" });
	check(
		"a tab dropped on the right of the app pane stands after it",
		JSON.stringify(shapeOf(store)) === '["chat","shown","tab-3"]',
		shapeOf(store),
	);
	store.place({ kind: "app", tabId: "tab-3" }, { targetId: "pane-chat", side: "left" });
	check(
		"placing a tab that already stands moves it, never copies it",
		JSON.stringify(shapeOf(store)) === '["tab-3","chat","shown"]',
		shapeOf(store),
	);
	store.place({ kind: "app", tabId: "tab-4" }, { targetId: "pane-app", side: "bottom" });
	const root = store.now().root;
	check(
		"a drop on the bottom edge wraps the pane in a column",
		root?.kind === "split" && JSON.stringify(root.children.map((child) => child.kind)) === '["pane","pane","split"]',
		root,
	);
	const leafIds = leavesOf(store.now().root).map((leaf) => leaf.id);
	leafIds.forEach((id) => store.close(id));
	check("closing every pane leaves an empty board", store.now().root === null, store.now().root);
	store.place({ kind: "chat" }, { targetId: null, side: "right" });
	check("a pane placed on an empty board is the whole board", store.now().root?.kind === "pane", store.now().root);
	const tabs = new HostTabs(null, "chat-1");
	tabs.open({ app: "browser", pageId: null }, { chatId: WORKSPACE_LIST, groupId: null, before: null });
	tabs.open({ app: "browser", pageId: null }, { chatId: WORKSPACE_LIST, groupId: null, before: null });
	const sidebar = sidebarOf({
		moment: tabs.now(),
		essentials: [],
		pages: [],
		shownApp: null,
		chat: { id: "chat-1", title: "Chat" },
		shutLists: [],
		inPanes: ["tab-1"],
	});
	const rows =
		sidebar.sections[0]?.entries.flatMap((entry) =>
			entry.kind === "tab" ? [[entry.tab.id, entry.tab.isShown]] : [],
		) ?? [];
	check(
		"a tab standing in a pane is marked shown in the sidebar",
		JSON.stringify(rows) === '[["tab-1",true],["tab-2",false]]',
		rows,
	);
	checksShares();
	checksTarget();
	console.info = quiet;
	const halves = paneLayoutOf(FIRST_PANES.root, { left: 0, top: 0, width: 1008, height: 800 }, 8).rects;
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
		8,
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

function sharesOf(store: PaneTreeStore): readonly number[] {
	const root = store.now().root;
	return root?.kind === "split" ? root.shares.map((share) => Math.round(share * 1000) / 1000) : [];
}

function checksTarget(): void {
	const store = new PaneTreeStore(FIRST_PANES, KEEP_NOTHING);
	store.place({ kind: "app", tabId: "tab-3" }, { targetId: "pane-app", side: "right" });
	const afterDrop = store.now().targetId;
	store.aimAt("pane-chat");
	const afterChat = store.now().targetId;
	store.aimAt("pane-app");
	const afterApp = store.now().targetId;
	store.aimAt("pane-1");
	store.showIn("pane-1", "tab-9");
	const shownIn = store.leaves().find((leaf) => leaf.id === "pane-1")?.view;
	store.close("pane-1");
	check(
		"a dropped tab's pane becomes the target, the chat never does, a press aims a pane, and showing replaces the target's tab",
		afterDrop === "pane-1" &&
			afterChat === "pane-1" &&
			afterApp === "pane-app" &&
			JSON.stringify(shownIn) === '{"kind":"app","tabId":"tab-9"}' &&
			store.now().targetId === null,
		[afterDrop, afterChat, afterApp, shownIn, store.now().targetId],
	);
}

function checksShares(): void {
	const even = new PaneTreeStore(FIRST_PANES, KEEP_NOTHING);
	even.place({ kind: "app", tabId: "tab-3" }, { targetId: "pane-chat", side: "right" });
	check(
		"a pane dropped between halves gives every pane a third",
		JSON.stringify(sharesOf(even)) === "[0.333,0.333,0.333]",
		sharesOf(even),
	);
	const uneven = new PaneTreeStore(FIRST_PANES, KEEP_NOTHING);
	uneven.resize("pane-root", 0, 2 / 3);
	uneven.place({ kind: "app", tabId: "tab-3" }, { targetId: "pane-chat", side: "right" });
	check(
		"a new pane takes a third and the others shrink in proportion",
		JSON.stringify(sharesOf(uneven)) === "[0.444,0.333,0.222]",
		sharesOf(uneven),
	);
	uneven.close("pane-1");
	check(
		"closing a pane gives its share back in proportion",
		JSON.stringify(sharesOf(uneven)) === "[0.667,0.333]",
		sharesOf(uneven),
	);
	const nested = new PaneTreeStore(FIRST_PANES, KEEP_NOTHING);
	nested.place({ kind: "app", tabId: "tab-3" }, { targetId: "pane-app", side: "bottom" });
	nested.place({ kind: "app", tabId: "tab-4" }, { targetId: "pane-1", side: "right" });
	nested.close("pane-app");
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
	const memories: LayoutMemories = {
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
	const first = layoutPartsOf(memories);
	first.paneTreeStore.place({ kind: "app", tabId: "tab-3" }, { targetId: "pane-app", side: "right" });
	first.paneTreeStore.resize("pane-root", 0, 0.25);
	const again = layoutPartsOf(memories).paneTreeStore.now();
	check(
		"a restart draws the panes as they were left: the same tree, the same shares",
		isDeepStrictEqual(again, first.paneTreeStore.now()),
		again,
	);
	panes.write({ root: "torn" });
	let refused: PaneTree | null = null;
	warnsOf(() => {
		refused = layoutPartsOf(memories).paneTreeStore.now();
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
		const memories: LayoutMemories = {
			widths: { left: memoryOf<number>(), chat: memoryOf<number>() },
			sides: { left: memoryOf<boolean>(), right: memoryOf<boolean>() },
			panes,
		};
		let started: PaneTree | null = null;
		const warned = warnsOf(() => {
			started = layoutPartsOf(memories).paneTreeStore.now();
		});
		check(
			`a kept tree with ${what} starts from the first panes and says why`,
			isDeepStrictEqual(started, FIRST_PANES) && warned.length === 1,
			{ started, warned },
		);
	}

	const torn = memoryOf<unknown>();
	const unreadable = { read: () => JSON.parse("{torn"), write: torn.write };
	const unread = warnsOf(() =>
		layoutPartsOf({
			widths: { left: memoryOf<number>(), chat: memoryOf<number>() },
			sides: { left: memoryOf<boolean>(), right: memoryOf<boolean>() },
			panes: unreadable,
		}),
	);
	check("kept panes that are not JSON warn with the parse error", unread[0]?.[1] instanceof SyntaxError, unread);
	console.info = quiet;
}

function checksGoneTabs(): void {
	console.info = () => undefined;
	const beside = new PaneTreeStore(FIRST_PANES, KEEP_NOTHING);
	beside.place({ kind: "app", tabId: "tab-3" }, { targetId: "pane-app", side: "right" });
	beside.dropGoneTabs(new Set());
	check(
		"a pane whose kept tab the host no longer holds is closed",
		JSON.stringify(shapeOf(beside)) === '["chat","shown"]',
		shapeOf(beside),
	);

	const alone = new PaneTreeStore(FIRST_PANES, KEEP_NOTHING);
	alone.showIn("pane-app", "tab-5");
	const said: string[] = [];
	console.info = (line: string) => said.push(line);
	alone.dropGoneTabs(new Set(["tab-1"]));
	console.info = () => undefined;
	check(
		"the only app pane keeps its place and shows no tab, logged as one transition",
		JSON.stringify(shapeOf(alone)) === '["chat","shown"]' &&
			said.length === 1 &&
			said[0]?.endsWith("(kept tab tab-5 is gone)") === true,
		{ shape: shapeOf(alone), said },
	);

	const held = new PaneTreeStore(FIRST_PANES, KEEP_NOTHING);
	held.showIn("pane-app", "tab-5");
	held.dropGoneTabs(new Set(["tab-5"]));
	check(
		"a pane whose tab the host holds is left alone",
		JSON.stringify(shapeOf(held)) === '["chat","tab-5"]',
		shapeOf(held),
	);
	console.info = quiet;
}

function checksStoresKeep(): void {
	console.info = () => undefined;
	const reasons: string[] = [];
	const memories: LayoutMemories = {
		widths: { left: memoryOf<number>(), chat: memoryOf<number>() },
		sides: { left: memoryOf<boolean>(), right: memoryOf<boolean>() },
		panes: { read: () => null, write: (_tree, reason) => reasons.push(reason) },
	};
	const parts = layoutPartsOf(memories);
	parts.frameSidesStore.toggle("left");
	parts.frameWidthsStore.become({ ...parts.frameWidthsStore.now(), chat: 640 }, "chat drag");
	parts.paneTreeStore.resize("pane-root", 0, 0.25);
	check(
		"each store keeps its own transitions: the hidden side, the width, the pane tree with its reason",
		memories.sides.left.read() === true &&
			memories.sides.right.read() === null &&
			memories.widths.chat.read() === 640 &&
			reasons.length === 1 &&
			reasons[0]?.startsWith("resize pane-root") === true,
		{ left: memories.sides.left.read(), chat: memories.widths.chat.read(), reasons },
	);
	parts.frameSidesStore.peek("left");
	check("a peek keeps the side hidden between starts", memories.sides.left.read() === true, memories.sides.left.read());
	console.info = quiet;
}

async function pageOf(folder: string): Promise<AskedPage> {
	const bundle = await bundleOf("tools/shell-frame-page.tsx");
	const sheets = ["packages/core/browser-host.css", "packages/host-obsidian/styles.css"]
		.map((at) => readFileSync(at, "utf8"))
		.join("\n");
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
	const idsOf = (panes: readonly unknown[]): string =>
		JSON.stringify(panes.map((pane) => (Array.isArray(pane) ? pane[0] : null)));
	check(
		"a web reload keeps the pane tree but closes the pane whose tab the host no longer holds",
		idsOf(reloaded) === idsOf(after.filter((pane) => Array.isArray(pane) && pane[0] !== "pane-1")),
		[after, reloaded],
	);
	const outside = await page.ask(`${CARRY}("over", 5, 5)`);
	check("a carry outside the board is not taken", outside === false, outside);
	await page.ask(`${CARRY}("leave", 5, 5)`);

	for (const id of ["pane-app", "pane-chat"]) {
		await page.ask(`document.querySelector('[data-pane-close="${id}"]').click(); true`);
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
checksStoresKeep();
await checksBoard(folder);
console.log(failed === 0 ? "pane board: all checks pass" : `pane board: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
