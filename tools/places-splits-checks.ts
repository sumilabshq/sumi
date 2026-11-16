import { BUILT_IN_APPS } from "./placed-apps-fixture.ts";
import type { Runtime } from "../packages/shared/data-framework/src/index.ts";
import { navigation } from "../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import type { SplitNode } from "../plugins/tabs/navigation/data/navigation/shared/schema/splits.schema.ts";
import { splitMapOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/splits/split-map.ts";
import { splitBreaksOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/splits/split-members.ts";
import { placeInView } from "../plugins/tabs/navigation/data/navigation/shared/lib/splits/split-moves.ts";
import { momentOfWindow } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/kept-tabs.ts";
import type { HostTabsMoment } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/host-tabs.ts";
import { MAIN_WINDOW } from "./places-fixture.ts";
import {
	AT,
	SPLIT_ON_BOARD,
	effectKindsOf,
	entryShapeOf,
	openShapesOf,
	rowOfTwo,
	sent,
	splitOf,
	started,
} from "./places-splits-fixture.ts";
import { check, tally } from "./check-helpers.ts";

const OPEN_WITH_SPLIT = [
	"chat",
	["tab-1", "tab-2"],
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

async function placingChecks(): Promise<void> {
	const { window } = started();
	const placed = await window.send(navigation.splits.placeInView, {
		at: AT,
		tabId: "tab-2",
		targetTabId: null,
		side: "right",
	});
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

async function fullChecks(window: Runtime): Promise<void> {
	await window.send(navigation.splits.placeInView, { at: AT, tabId: "tab-3", targetTabId: "tab-2", side: "bottom" });
	await window.send(navigation.splits.placeInView, { at: AT, tabId: "tab-4", targetTabId: "tab-1", side: "left" });
	const full = await window.send(navigation.splits.placeInView, {
		at: AT,
		tabId: "tab-5",
		targetTabId: "tab-1",
		side: "top",
	});
	check(
		"a fifth tab is refused: a split holds four at most",
		full.ok ? full.output : full.reason,
		'the split "split-1" holds 4 tabs already',
	);
	const unknown = await sent(
		window.send(navigation.splits.placeInView, { at: AT, tabId: "tab-9", targetTabId: "tab-1", side: "top" }),
	);
	check(
		"a tab places does not hold is not placed, so the board places it itself",
		typeof unknown === "string" ? unknown : unknown.isPlaced,
		false,
	);
}

async function swappingChecks(): Promise<void> {
	const { window, tabs } = started();
	await window.send(navigation.splits.placeInView, { at: AT, tabId: "tab-2", targetTabId: "tab-1", side: "right" });
	check(
		"showing a tab outside the split takes the whole split off the board, then draws that tab alone",
		await effectKindsOf(sent(window.send(navigation.tabShowing.show, { at: AT, id: "tab-3" }))),
		["leave-split", "open-shown-tab-pane"],
	);
	check("and nothing is shown as a split then", await splitOf(window), { shownId: "tab-3", split: null });
	check(
		"showing a member brings the whole split back, focused on that member",
		[
			await effectKindsOf(sent(window.send(navigation.tabShowing.show, { at: AT, id: "tab-1" }))),
			((await splitOf(window)) as { focused?: string }).focused,
		],
		[["show-split"], "tab-1"],
	);
	const moment = momentOfWindow(await tabs.placedTabs(), MAIN_WINDOW, BUILT_IN_APPS);
	check("the split is the window's shown view", moment.shownSplitId, "split-1");
	check(
		"showing another member of the shown split only moves the focus: no redraw",
		[
			await effectKindsOf(sent(window.send(navigation.tabShowing.show, { at: SPLIT_ON_BOARD, id: "tab-2" }))),
			((await splitOf(window)) as { focused?: string }).focused,
		],
		[["focus-split"], "tab-2"],
	);
	check(
		"showing the member already focused changes nothing",
		await effectKindsOf(sent(window.send(navigation.tabShowing.show, { at: SPLIT_ON_BOARD, id: "tab-2" }))),
		[],
	);
	check(
		"showing a member while the board lost the split draws it again",
		await effectKindsOf(sent(window.send(navigation.tabShowing.show, { at: AT, id: "tab-2" }))),
		["show-split"],
	);
}

async function dissolvingChecks(): Promise<void> {
	const { window } = started();
	await window.send(navigation.splits.placeInView, { at: AT, tabId: "tab-2", targetTabId: "tab-1", side: "right" });
	check(
		"closing a member of a split of two dissolves it and shows the other alone",
		[
			await effectKindsOf(sent(window.send(navigation.tabClosing.closeTab, { at: AT, id: "tab-2" }))),
			await splitOf(window),
		],
		[["leave-split", "open-shown-tab-pane"], { shownId: "tab-1", split: null }],
	);
	await window.send(navigation.splits.placeInView, { at: AT, tabId: "tab-3", targetTabId: "tab-1", side: "right" });
	await window.send(navigation.splits.placeInView, { at: AT, tabId: "tab-4", targetTabId: "tab-3", side: "bottom" });
	await window.send(navigation.splits.remove, { at: AT, tabId: "tab-4" });
	check("a member taken out of a split of three leaves two drawn", await splitOf(window), {
		members: ["tab-1", "tab-3"],
		focused: "tab-1",
		layout: rowOfTwo("split-2-b1", "tab-1", "tab-3"),
	});
}

async function draggingOutChecks(): Promise<void> {
	const { window } = started();
	await window.send(navigation.splits.placeInView, { at: AT, tabId: "tab-3", targetTabId: "tab-1", side: "right" });
	await window.send(navigation.splits.placeInView, { at: AT, tabId: "tab-4", targetTabId: "tab-3", side: "bottom" });
	await window.send(navigation.tabPlacing.place, {
		at: AT,
		id: "tab-4",
		place: { list: "workspace", groupId: null, before: "tab-2" },
	});
	check(
		"a member dragged out of a split of three leaves it and stands where it was dropped",
		await openShapesOf(window),
		[
			[
				"tab-1",
				"tab-3",
			],
			"tab-4",
			"tab-2",
			"tab-5",
		],
	);
	await window.send(navigation.tabPlacing.place, {
		at: AT,
		id: "tab-5",
		place: { list: "workspace", groupId: null, before: "tab-3" },
	});
	check("a tab dropped before any member of a split stands before the whole split", await openShapesOf(window), [
		"tab-5",
		[
			"tab-1",
			"tab-3",
		],
		"tab-4",
		"tab-2",
	]);
}

async function carryingChecks(): Promise<void> {
	const { window } = started();
	await window.send(navigation.splits.placeInView, { at: AT, tabId: "tab-2", targetTabId: "tab-1", side: "right" });
	await window.send(navigation.tabPlacing.place, {
		at: AT,
		id: "tab-2",
		place: { list: "workspace", groupId: null, before: "tab-1" },
	});
	check("the shown member carried out of a split of two stays shown, alone", await splitOf(window), {
		shownId: "tab-2",
		split: null,
	});
	await window.send(navigation.splits.placeInView, { at: AT, tabId: "tab-3", targetTabId: "tab-1", side: "right" });
	await window.send(navigation.splits.placeInView, { at: AT, tabId: "tab-4", targetTabId: "tab-3", side: "bottom" });
	await window.send(navigation.tabPlacing.place, {
		at: AT,
		id: "tab-4",
		place: { list: "workspace", groupId: null, before: "tab-4" },
	});
	check("a member dropped right above its own split leaves it and stands above the split", await openShapesOf(window), [
		"tab-2",
		"tab-4",
		[
			"tab-1",
			"tab-3",
		],
		"tab-5",
	]);
	await window.send(navigation.splits.reorderMember, { at: AT, tabId: "tab-3", before: "tab-1" });
	check("a member reordered inside its split moves only in the split", await openShapesOf(window), [
		"tab-2",
		"tab-4",
		[
			"tab-3",
			"tab-1",
		],
		"tab-5",
	]);
}

async function dissolvedPlaceChecks(): Promise<void> {
	const { window } = started();
	await window.send(navigation.splits.placeInView, { at: AT, tabId: "tab-4", targetTabId: "tab-1", side: "right" });
	await window.send(navigation.tabPlacing.place, {
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

async function sidebarChecks(): Promise<void> {
	const { window } = started();
	await window.send(navigation.splits.placeInView, { at: AT, tabId: "tab-2", targetTabId: "tab-1", side: "right" });
	const sidebar = await sent(window.send(navigation.tabs.sidebar, { at: AT }));
	const sections = typeof sidebar === "string" ? [] : sidebar.sections;
	const open = sections.find((section) => section.list === "workspace")?.entries ?? [];
	check("the split stands in the list once, in place of its members", open.map(entryShapeOf), OPEN_WITH_SPLIT);
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
	const moment = momentOfWindow(await tabs.placedTabs(), MAIN_WINDOW, BUILT_IN_APPS);
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
await swappingChecks();
await dissolvingChecks();
await draggingOutChecks();
await carryingChecks();
await dissolvedPlaceChecks();
await sidebarChecks();
mapChecks();
await lawChecks();

if (tally.failed > 0) {
	console.log(`places splits: ${tally.failed} failed`);
	process.exit(1);
}

console.log("places splits: all checks passed");
