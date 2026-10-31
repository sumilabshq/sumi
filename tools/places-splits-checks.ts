import type { StartedApp } from "../packages/shared/core/src/requests/index.ts";
import { app } from "../packages/shared/core/src/requests/index.ts";
import {
	CloseTabCommand,
	PinTabCommand,
	PlaceInViewCommand,
	PlaceTabCommand,
	PlacesModule,
	ReorderSplitMemberCommand,
	RemoveFromSplitCommand,
	ShowTabCommand,
	ShownSplitQuery,
	SidebarQuery,
} from "../packages/state/places/index.ts";
import type { Screen, TabsAsk } from "../packages/state/places/index.ts";
import type { SidebarEntry } from "../packages/state/places/shared/schema/tab-rows.schema.ts";
import type { SplitDir, SplitNode } from "../packages/state/places/shared/schema/splits.schema.ts";
import { MemoryTabsGateway } from "../packages/state/places/gateways/tabs/memory.gateway.ts";
import { splitMapOf } from "../packages/state/places/shared/lib/splits/split-map.ts";
import { splitBreaksOf } from "../packages/state/places/shared/lib/splits/split-members.ts";
import { placeInView } from "../packages/state/places/shared/lib/splits/split-moves.ts";
import { momentOfWindow } from "../packages/state/places/shared/lib/tabs/kept-tabs.ts";
import type { HostTabsMoment } from "../packages/state/places/shared/lib/tabs/host-tabs.ts";
import { MAIN_WINDOW, placedTabsOf, placesLinkOf } from "./places-fixture.ts";
import { check, tally } from "./check-helpers.ts";

const NO_SCREEN: Screen = {
	pages: [],
	isBrowserAvailable: false,
	canOpenOwnWindow: false,
	tabPanes: [],
	shownTabPaneId: null,
	tabTargetId: null,
	chatGroups: [],
	elsewhere: [],
	focusedChatId: null,
};

const AT: TabsAsk = { window: MAIN_WINDOW, view: "canvas", screen: NO_SCREEN };

const SEED = {
	tabs: ["tab-1", "tab-2", "tab-3", "tab-4", "tab-5", "tab-6"].map((id) => ({
		id,
		app: "canvas" as const,
		pageId: null,
		label: null,
	})),
	lists: {
		workspace: ["tab-1", "tab-2", "tab-3", "tab-4", "tab-5"].map((id) => ({ kind: "tab" as const, id })),
		chat: [{ kind: "tab" as const, id: "tab-6" }],
	},
	shownId: "tab-1",
	minted: 6,
	closed: [],
};

const OPEN_WITH_SPLIT = [
	"chat",
	[
		["tab-1", true],
		["tab-2", false],
	],
	"tab-3",
	"tab-4",
	"tab-5",
];

const THREE_PANES: SplitNode = {
	kind: "branch",
	id: "b1",
	dir: "row",
	shares: [0.6, 0.4],
	children: [{ kind: "tab", tabId: "a" }, rowOfTwo("b2", "b", "c", "column")],
};

console.info = () => undefined;

function rowOfTwo(id: string, first: string, second: string, dir: SplitDir = "row"): SplitNode {
	return {
		kind: "branch",
		id,
		dir,
		children: [
			{ kind: "tab", tabId: first },
			{ kind: "tab", tabId: second },
		],
		shares: [0.5, 0.5],
	};
}

function entryShapeOf(entry: SidebarEntry): unknown {
	if (entry.kind === "split") {
		return entry.split.members.map((member) => [member.item.kind === "tab" ? member.item.tab.id : "", member.isPinned]);
	}

	return entry.kind === "tab" ? entry.tab.id : entry.kind;
}

function started(): { readonly window: StartedApp; readonly tabs: MemoryTabsGateway } {
	const tabs = new MemoryTabsGateway(placedTabsOf(SEED, ["chat"]));
	return {
		window: app()
			.imports(PlacesModule.over(placesLinkOf(tabs)))
			.start(),
		tabs,
	};
}

async function sent<T>(answer: Promise<{ ok: true; output: T } | { ok: false; reason: string }>): Promise<T | string> {
	const settled = await answer;
	return settled.ok ? settled.output : settled.reason;
}

async function effectKindsOf(answer: Promise<unknown>): Promise<unknown> {
	const settled = await answer;
	return typeof settled === "object" && settled !== null && "effects" in settled && Array.isArray(settled.effects)
		? settled.effects.map((effect: { kind: string }) => effect.kind)
		: settled;
}

async function splitOf(window: StartedApp): Promise<unknown> {
	const shown = await sent(window.send(ShownSplitQuery, { window: MAIN_WINDOW }));
	return typeof shown === "string" || shown.split === null
		? shown
		: { members: shown.split.memberIds, focused: shown.split.focusedId, layout: shown.split.layout };
}

async function placingChecks(): Promise<void> {
	const { window } = started();
	const placed = await window.send(PlaceInViewCommand, { at: AT, tabId: "tab-2", targetTabId: null, side: "right" });
	check(
		"a tab dropped on the right of the shown tab makes a split of the two and draws it",
		placed.ok ? [placed.output.isPlaced, placed.output.effects.map((effect) => effect.kind)] : placed.reason,
		[true, ["show-split"]],
	);
	check("the split holds both, side by side, the dropped one focused", await splitOf(window), {
		members: ["tab-1", "tab-2"],
		focused: "tab-2",
		layout: rowOfTwo("split-1-b1", "tab-1", "tab-2"),
	});
	await fullChecks(window);
}

async function fullChecks(window: StartedApp): Promise<void> {
	await window.send(PlaceInViewCommand, { at: AT, tabId: "tab-3", targetTabId: "tab-2", side: "bottom" });
	await window.send(PlaceInViewCommand, { at: AT, tabId: "tab-4", targetTabId: "tab-1", side: "left" });
	const full = await window.send(PlaceInViewCommand, { at: AT, tabId: "tab-5", targetTabId: "tab-1", side: "top" });
	check(
		"a fifth tab is refused: a split holds four at most",
		full.ok ? full.output : full.reason,
		'the split "split-1" holds 4 tabs already',
	);
	const unknown = await sent(
		window.send(PlaceInViewCommand, { at: AT, tabId: "tab-9", targetTabId: "tab-1", side: "top" }),
	);
	check(
		"a tab places does not hold is not placed, so the board places it itself",
		typeof unknown === "string" ? unknown : unknown.isPlaced,
		false,
	);
}

async function liftingChecks(): Promise<void> {
	const lifted = started();
	await lifted.window.send(PlaceInViewCommand, { at: AT, tabId: "tab-6", targetTabId: "tab-1", side: "right" });
	const listed = momentOfWindow(await lifted.tabs.placedTabs(), MAIN_WINDOW).lists;
	check(
		"a chat's own tab dropped in the view is lifted out of the chat into Open first",
		[
			((await splitOf(lifted.window)) as { members?: unknown }).members,
			listed["chat"]?.length,
			listed["workspace"]?.at(-1)?.id,
		],
		[["tab-1", "tab-6"], 0, "tab-6"],
	);
}

async function swappingChecks(): Promise<void> {
	const { window, tabs } = started();
	await window.send(PlaceInViewCommand, { at: AT, tabId: "tab-2", targetTabId: "tab-1", side: "right" });
	check(
		"showing a tab outside the split takes the whole split off the board, then draws that tab alone",
		await effectKindsOf(sent(window.send(ShowTabCommand, { at: AT, id: "tab-3" }))),
		["leave-split", "open-shown-tab-pane"],
	);
	check("and nothing is shown as a split then", await splitOf(window), { shownId: "tab-3", split: null });
	check(
		"showing a member brings the whole split back, focused on that member",
		[
			await effectKindsOf(sent(window.send(ShowTabCommand, { at: AT, id: "tab-1" }))),
			((await splitOf(window)) as { focused?: string }).focused,
		],
		[["show-split"], "tab-1"],
	);
	const moment = momentOfWindow(await tabs.placedTabs(), MAIN_WINDOW);
	check("the split is the window's shown view", moment.shownSplitId, "split-1");
	check(
		"showing another member of the shown split only moves the focus: no redraw",
		[
			await effectKindsOf(sent(window.send(ShowTabCommand, { at: AT, id: "tab-2" }))),
			((await splitOf(window)) as { focused?: string }).focused,
		],
		[["focus-split"], "tab-2"],
	);
	check(
		"showing the member already focused changes nothing",
		await effectKindsOf(sent(window.send(ShowTabCommand, { at: AT, id: "tab-2" }))),
		[],
	);
}

async function dissolvingChecks(): Promise<void> {
	const { window } = started();
	await window.send(PlaceInViewCommand, { at: AT, tabId: "tab-2", targetTabId: "tab-1", side: "right" });
	check(
		"closing a member of a split of two dissolves it and shows the other alone",
		[await effectKindsOf(sent(window.send(CloseTabCommand, { at: AT, id: "tab-2" }))), await splitOf(window)],
		[["leave-split", "open-shown-tab-pane"], { shownId: "tab-1", split: null }],
	);
	await window.send(PlaceInViewCommand, { at: AT, tabId: "tab-3", targetTabId: "tab-1", side: "right" });
	await window.send(PlaceInViewCommand, { at: AT, tabId: "tab-4", targetTabId: "tab-3", side: "bottom" });
	await window.send(RemoveFromSplitCommand, { at: AT, tabId: "tab-4" });
	check("a member taken out of a split of three leaves two drawn", await splitOf(window), {
		members: ["tab-1", "tab-3"],
		focused: "tab-1",
		layout: rowOfTwo("split-2-b1", "tab-1", "tab-3"),
	});
}

async function openShapesOf(window: StartedApp): Promise<unknown> {
	const sidebar = await sent(window.send(SidebarQuery, { at: AT, essentials: [] }));
	const sections = typeof sidebar === "string" ? [] : sidebar.sections;
	const open = sections.find((section) => section.list === "workspace")?.entries ?? [];
	return open.map(entryShapeOf).filter((shape) => shape !== "chat");
}

async function draggingOutChecks(): Promise<void> {
	const { window } = started();
	await window.send(PlaceInViewCommand, { at: AT, tabId: "tab-3", targetTabId: "tab-1", side: "right" });
	await window.send(PlaceInViewCommand, { at: AT, tabId: "tab-4", targetTabId: "tab-3", side: "bottom" });
	await window.send(PlaceTabCommand, {
		at: AT,
		id: "tab-4",
		place: { list: "workspace", groupId: null, before: "tab-2" },
	});
	check(
		"a member dragged out of a split of three leaves it and stands where it was dropped",
		await openShapesOf(window),
		[
			[
				["tab-1", false],
				["tab-3", false],
			],
			"tab-4",
			"tab-2",
			"tab-5",
		],
	);
	await window.send(PlaceTabCommand, {
		at: AT,
		id: "tab-5",
		place: { list: "workspace", groupId: null, before: "tab-3" },
	});
	check("a tab dropped before any member of a split stands before the whole split", await openShapesOf(window), [
		"tab-5",
		[
			["tab-1", false],
			["tab-3", false],
		],
		"tab-4",
		"tab-2",
	]);
}

async function carryingChecks(): Promise<void> {
	const { window } = started();
	await window.send(PlaceInViewCommand, { at: AT, tabId: "tab-2", targetTabId: "tab-1", side: "right" });
	await window.send(PlaceTabCommand, {
		at: AT,
		id: "tab-2",
		place: { list: "workspace", groupId: null, before: "tab-1" },
	});
	check("the shown member carried out of a split of two stays shown, alone", await splitOf(window), {
		shownId: "tab-2",
		split: null,
	});
	await window.send(PlaceInViewCommand, { at: AT, tabId: "tab-3", targetTabId: "tab-1", side: "right" });
	await window.send(PlaceInViewCommand, { at: AT, tabId: "tab-4", targetTabId: "tab-3", side: "bottom" });
	await window.send(PlaceTabCommand, {
		at: AT,
		id: "tab-4",
		place: { list: "workspace", groupId: null, before: "tab-4" },
	});
	check("a member dropped right above its own split leaves it and stands above the split", await openShapesOf(window), [
		"tab-2",
		"tab-4",
		[
			["tab-1", false],
			["tab-3", false],
		],
		"tab-5",
	]);
	await window.send(ReorderSplitMemberCommand, { at: AT, tabId: "tab-3", before: "tab-1" });
	check("a member reordered inside its split moves only in the split", await openShapesOf(window), [
		"tab-2",
		"tab-4",
		[
			["tab-3", false],
			["tab-1", false],
		],
		"tab-5",
	]);
}

async function dissolvedPlaceChecks(): Promise<void> {
	const { window } = started();
	await window.send(PlaceInViewCommand, { at: AT, tabId: "tab-4", targetTabId: "tab-1", side: "right" });
	await window.send(PlaceTabCommand, {
		at: AT,
		id: "tab-1",
		place: { list: "workspace", groupId: null, before: "tab-5" },
	});
	check(
		"when a split of two dissolves, the member left behind stands where the split stood",
		await openShapesOf(window),
		["tab-4", "tab-2", "tab-3", "tab-1", "tab-5"],
	);
}

async function pinnedMemberChecks(): Promise<void> {
	const { window } = started();
	await window.send(PlaceInViewCommand, { at: AT, tabId: "tab-2", targetTabId: "tab-1", side: "right" });
	await window.send(PinTabCommand, { window: MAIN_WINDOW, id: "tab-1", isPinned: true });
	await window.send(PinTabCommand, { window: MAIN_WINDOW, id: "tab-3", isPinned: true });
	await window.send(PlaceTabCommand, {
		at: AT,
		id: "tab-1",
		place: { list: "pinned", groupId: null, before: null },
	});
	check("a pinned member reordered inside Pinned keeps its split", await splitOf(window), {
		members: ["tab-1", "tab-2"],
		focused: "tab-2",
		layout: rowOfTwo("split-1-b1", "tab-1", "tab-2"),
	});
}

async function sidebarChecks(): Promise<void> {
	const { window } = started();
	await window.send(PlaceInViewCommand, { at: AT, tabId: "tab-2", targetTabId: "tab-1", side: "right" });
	await window.send(PinTabCommand, { window: MAIN_WINDOW, id: "tab-1", isPinned: true });
	const sidebar = await sent(window.send(SidebarQuery, { at: AT, essentials: [] }));
	const sections = typeof sidebar === "string" ? [] : sidebar.sections;
	const pinned = sections.find((section) => section.list === "pinned")?.entries ?? [];
	const open = sections.find((section) => section.list === "workspace")?.entries ?? [];
	check(
		"a pinned member stays in Pinned, marked with the map whose own cell is marked",
		pinned.map((entry) => (entry.kind === "tab" ? [entry.tab.id, entry.splitMark?.map.markedId] : entry.kind)),
		[["tab-1", "tab-1"]],
	);
	check(
		"and the split stands in Open once, in place of its unpinned members, the pinned one marked inside",
		open.map(entryShapeOf),
		OPEN_WITH_SPLIT,
	);
	await allPinnedChecks(window);
}

async function allPinnedChecks(window: StartedApp): Promise<void> {
	await window.send(PinTabCommand, { window: MAIN_WINDOW, id: "tab-2", isPinned: true });
	const allPinned = await sent(window.send(SidebarQuery, { at: AT, essentials: [] }));
	check(
		"a split whose every member is pinned stands once in Pinned",
		typeof allPinned === "string"
			? allPinned
			: allPinned.sections.map((section) =>
					section.entries.map((entry) =>
						entry.kind === "tab" && entry.children !== undefined ? "holder" : entry.kind,
					),
				),
		[["split"], ["holder", "tab", "tab", "tab"]],
	);
}

function mapChecks(): void {
	const map = splitMapOf(THREE_PANES, "b");
	check(
		"the map's cells are the panes' proportions of the unit square",
		map.cells.map((cell) =>
			[cell.tabId, cell.x, cell.y, cell.w, cell.h].map((one) => (typeof one === "number" ? +one.toFixed(2) : one)),
		),
		[
			["a", 0, 0, 0.6, 1],
			["b", 0.6, 0, 0.4, 0.5],
			["c", 0.6, 0.5, 0.4, 0.5],
		],
	);
}

async function lawChecks(): Promise<void> {
	const { tabs } = started();
	const moment = momentOfWindow(await tabs.placedTabs(), MAIN_WINDOW);
	const placed = placeInView(moment, { tabId: "tab-2", targetTabId: "tab-1", side: "right" });
	const first = "moment" in placed ? placed.moment.splits[0] : undefined;
	const twice: HostTabsMoment =
		"moment" in placed && first !== undefined
			? { ...placed.moment, splits: [first, { ...first, id: "split-9" }] }
			: moment;
	check(
		"a tab standing in two splits breaks the law the writer checks",
		splitBreaksOf(twice).some((broken) => broken.includes("stands in 2 splits")),
		true,
	);
}

await placingChecks();
await liftingChecks();
await swappingChecks();
await dissolvingChecks();
await draggingOutChecks();
await carryingChecks();
await pinnedMemberChecks();
await dissolvedPlaceChecks();
await sidebarChecks();
mapChecks();
await lawChecks();

if (tally.failed > 0) {
	console.log(`places splits: ${tally.failed} failed`);
	process.exit(1);
}

console.log("places splits: all checks passed");
