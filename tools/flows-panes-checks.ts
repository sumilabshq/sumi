import { navigation } from "../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import { flowPanesOf, panesOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/flows/flow-nodes.ts";
import {
	isRefusedEdit,
	layoutWithPaneClosed,
} from "../plugins/tabs/navigation/data/navigation/shared/lib/flows/flow-pane-edits.ts";
import type { Flow } from "../plugins/tabs/navigation/data/navigation/shared/schema/flows.schema.ts";
import { BARE_SCREEN } from "./places-fixture.ts";
import { chatIdOf } from "./flows-fixture.ts";
import { MAIN, SIDE, chatFlow, flowsIn, lawsOf, refusalOf, standOver } from "./flows-stand.ts";
import type { Stand } from "./flows-stand.ts";
import { check, tally } from "./check-helpers.ts";

const FLOW = chatFlow(3);
const CHAT = chatIdOf(3);
const LEFT = "pane-3";
const RIGHT = "pane-31";

async function flowOf(stand: Stand): Promise<Flow> {
	const flow = (await flowsIn(stand)).flows.find(({ id }) => id === FLOW);

	if (flow === undefined) {
		throw new Error("the flow is gone");
	}

	return flow;
}

async function tabsOfPanes(stand: Stand): Promise<readonly (readonly string[])[]> {
	return flowPanesOf(await flowOf(stand)).map((pane) => pane.tabIds);
}

async function sharesOf(stand: Stand): Promise<readonly number[] | null> {
	const { root } = (await flowOf(stand)).layout;
	return root.kind === "split" ? root.shares : null;
}

async function boardChecks(): Promise<void> {
	const stand = standOver(true);
	const board = await stand.app.send(navigation.flowPanes.board, { flowId: FLOW });
	check(
		"the board answers the layout and the tabs of the flow",
		[board?.layout.focusedPaneId, board?.tabs.map(({ id }) => id)],
		[LEFT, [CHAT, "sub-3-1", "sub-3-2", "sub-3-3"]],
	);
	check(
		"a flow that does not exist has no board",
		await stand.app.send(navigation.flowPanes.board, { flowId: "flow-none" }),
		null,
	);
}

async function showAndFocusChecks(): Promise<void> {
	const stand = standOver(true);
	await stand.app.send(navigation.flowPanes.showTab, { window: MAIN, flowId: FLOW, tabId: "sub-3-1" });
	const shown = await flowOf(stand);
	check(
		"showing a tab makes it the active tab of its pane",
		flowPanesOf(shown).find(({ id }) => id === LEFT)?.activeTabId,
		"sub-3-1",
	);
	check("and focuses that pane", shown.layout.focusedPaneId, LEFT);
	await stand.app.send(navigation.flowPanes.showTab, { window: MAIN, flowId: FLOW, tabId: "sub-3-2" });
	check("showing a tab of another pane moves the focus", (await flowOf(stand)).layout.focusedPaneId, RIGHT);
	await stand.app.send(navigation.flowPanes.focus, { window: MAIN, flowId: FLOW, paneId: LEFT });
	check("focus sets the focused pane", (await flowOf(stand)).layout.focusedPaneId, LEFT);
	check(
		"a pane that does not exist is refused",
		(
			await refusalOf(() =>
				stand.app.send(navigation.flowPanes.focus, { window: MAIN, flowId: FLOW, paneId: "pane-none" }),
			)
		).includes("no pane"),
		true,
	);
	check(
		"a tab of another flow is refused",
		(
			await refusalOf(() =>
				stand.app.send(navigation.flowPanes.showTab, { window: MAIN, flowId: FLOW, tabId: "sub-1-1" }),
			)
		).includes("no tab"),
		true,
	);
}

async function moveChecks(): Promise<void> {
	const stand = standOver(true);
	await stand.app.send(navigation.flowPanes.moveTab, {
		window: MAIN,
		flowId: FLOW,
		tabId: "sub-3-1",
		paneId: RIGHT,
		before: "sub-3-2",
	});
	check("a tab moves to another pane before a tab", await tabsOfPanes(stand), [
		[CHAT, "sub-3-3"],
		["sub-3-1", "sub-3-2"],
	]);
	check(
		"and is the active tab there",
		flowPanesOf(await flowOf(stand)).find(({ id }) => id === RIGHT)?.activeTabId,
		"sub-3-1",
	);
	await stand.app.send(navigation.flowPanes.moveTab, {
		window: MAIN,
		flowId: FLOW,
		tabId: "sub-3-3",
		paneId: LEFT,
		before: CHAT,
	});
	check("a tab moves inside its pane", (await tabsOfPanes(stand))[0], ["sub-3-3", CHAT]);
	check(
		"a before that stands in another pane is refused",
		(
			await refusalOf(() =>
				stand.app.send(navigation.flowPanes.moveTab, {
					window: MAIN,
					flowId: FLOW,
					tabId: CHAT,
					paneId: LEFT,
					before: "sub-3-2",
				}),
			)
		).includes("holds no tab"),
		true,
	);
	await stand.app.send(navigation.flowPanes.moveTab, {
		window: MAIN,
		flowId: FLOW,
		tabId: "sub-3-1",
		paneId: LEFT,
		before: null,
	});
	await stand.app.send(navigation.flowPanes.moveTab, {
		window: MAIN,
		flowId: FLOW,
		tabId: "sub-3-2",
		paneId: LEFT,
		before: null,
	});
	const collapsed = await flowOf(stand);
	check(
		"moving the last tab out of a pane removes the pane",
		[collapsed.layout.root.kind, flowPanesOf(collapsed).length],
		["pane", 1],
	);
	check("every law holds after the moves", await lawsOf(stand), []);
}

async function splitChecks(): Promise<void> {
	const stand = standOver(true);
	await stand.app.send(navigation.flowPanes.split, {
		window: MAIN,
		flowId: FLOW,
		paneId: LEFT,
		side: "right",
		tabId: "sub-3-3",
	});
	check(
		"a split beside a pane in the same direction adds a sibling",
		[await tabsOfPanes(stand), await sharesOf(stand)],
		[
			[[CHAT, "sub-3-1"], ["sub-3-3"], ["sub-3-2"]],
			[0.25, 0.25, 0.3],
		],
	);
	check("the new pane takes the focus", (await flowOf(stand)).layout.focusedPaneId.startsWith("pane-m"), true);
	await stand.app.send(navigation.flowPanes.split, {
		window: MAIN,
		flowId: FLOW,
		paneId: LEFT,
		side: "bottom",
		tabId: "sub-3-1",
	});
	const nested = (await flowOf(stand)).layout.root;
	check(
		"a split across the direction nests a split",
		nested.kind === "split" && nested.children.some((child) => child.kind === "split" && child.dir === "column"),
		true,
	);
	check("every law holds after the splits", await lawsOf(stand), []);
	check(
		"a pane that holds only the tab cannot be split by it",
		(
			await refusalOf(() =>
				stand.app.send(navigation.flowPanes.split, {
					window: MAIN,
					flowId: FLOW,
					paneId: RIGHT,
					side: "left",
					tabId: "sub-3-2",
				}),
			)
		).includes("holds only this tab"),
		true,
	);
}

async function closeAndResizeChecks(): Promise<void> {
	const stand = standOver(true);
	await stand.app.send(navigation.flowPanes.resize, {
		window: MAIN,
		flowId: FLOW,
		splitId: "pane-3-group",
		at: 0,
		share: 0.6,
	});
	check(
		"resize moves the share between two neighbours",
		(await sharesOf(stand))?.map((share) => Math.round(share * 100) / 100),
		[0.6, 0.2],
	);
	check(
		"a share past its neighbours is refused",
		(
			await refusalOf(() =>
				stand.app.send(navigation.flowPanes.resize, {
					window: MAIN,
					flowId: FLOW,
					splitId: "pane-3-group",
					at: 0,
					share: 0.9,
				}),
			)
		).includes("between 0"),
		true,
	);
	check(
		"a split that does not exist is refused",
		(
			await refusalOf(() =>
				stand.app.send(navigation.flowPanes.resize, {
					window: MAIN,
					flowId: FLOW,
					splitId: "split-none",
					at: 0,
					share: 0.1,
				}),
			)
		).includes("no split"),
		true,
	);
	const edited = layoutWithPaneClosed((await flowOf(stand)).layout, RIGHT);
	check(
		"the layout edit itself keeps the closed pane's tabs, with no help from the reconcile",
		isRefusedEdit(edited) ? edited : panesOf(edited.root).map((pane) => pane.tabIds),
		[[CHAT, "sub-3-1", "sub-3-3", "sub-3-2"]],
	);
	await stand.app.send(navigation.flowPanes.closePane, { window: MAIN, flowId: FLOW, paneId: RIGHT });
	check("closing a pane gives its tabs to the neighbour", await tabsOfPanes(stand), [
		[CHAT, "sub-3-1", "sub-3-3", "sub-3-2"],
	]);
	check("and leaves one pane focused", (await flowOf(stand)).layout.focusedPaneId, LEFT);
	check(
		"the sole pane cannot be closed",
		(
			await refusalOf(() =>
				stand.app.send(navigation.flowPanes.closePane, { window: MAIN, flowId: FLOW, paneId: LEFT }),
			)
		).includes("sole pane"),
		true,
	);
	check("every law holds after close and resize", await lawsOf(stand), []);
}

async function closeLastTabChecks(): Promise<void> {
	const stand = standOver(true);
	await stand.app.send(navigation.tabClosing.closeTab, { at: { window: MAIN, screen: BARE_SCREEN }, id: "sub-3-2" });
	const flow = await flowOf(stand);
	check(
		"closing the last tab of a pane collapses the pane",
		[flow.layout.root.kind, flowPanesOf(flow).length],
		["pane", 1],
	);
	check(
		"the focus stays on a pane that exists",
		flowPanesOf(flow).some(({ id }) => id === flow.layout.focusedPaneId),
		true,
	);
	check("every law holds after the close", await lawsOf(stand), []);
}

async function holdChecks(): Promise<void> {
	const stand = standOver(true);
	await stand.app.send(navigation.flows.open, { window: MAIN, flowId: FLOW });
	const refused = await refusalOf(() =>
		stand.app.send(navigation.flowPanes.closePane, { window: SIDE, flowId: FLOW, paneId: RIGHT }),
	);
	check(
		"a window that does not hold a flow cannot change its panes",
		refused.includes("only that window changes its panes"),
		true,
	);
	check("and the layout is as it was", await tabsOfPanes(stand), [[CHAT, "sub-3-1", "sub-3-3"], ["sub-3-2"]]);
	await stand.app.send(navigation.flowPanes.closePane, { window: MAIN, flowId: FLOW, paneId: RIGHT });
	check("the holder changes them", (await tabsOfPanes(stand)).length, 1);
}

console.info = () => undefined;
console.warn = () => undefined;
console.error = () => undefined;
await boardChecks();
await showAndFocusChecks();
await moveChecks();
await splitChecks();
await closeAndResizeChecks();
await closeLastTabChecks();
await holdChecks();
console.log(tally.failed ? `flows panes: ${tally.failed} check(s) failed` : "flows panes: all checks passed");
process.exit(tally.failed ? 1 : 0);
