import { navigation } from "../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import { flowPanesOf, flowTabIdsOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/flows/flow-nodes.ts";
import type { Flow, FlowsDoc } from "../plugins/tabs/navigation/data/navigation/shared/schema/flows.schema.ts";
import { BROWSER_SCREEN, WEB_APP, atOf } from "./flows-asks.ts";
import { chatIdOf } from "./flows-fixture.ts";
import { MAIN, SIDE, chatFlow, flowsIn, lawsOf, refusalOf, standOver } from "./flows-stand.ts";
import { check, tally } from "./check-helpers.ts";

async function openChecks(): Promise<void> {
	const stand = standOver(true);
	const first = await stand.app.send(navigation.flows.open, { window: MAIN, flowId: chatFlow(2), at: atOf(MAIN) });
	const { tabs, flows } = await stand.tabs.places();
	check(
		"open sets the flow of the window and answers no effect",
		[flows?.windowFlows[MAIN], first.effects],
		[chatFlow(2), []],
	);
	check("opening reads an unread chat", tabs.tabs.find(({ id }) => id === chatIdOf(2))?.mark, "none");
	const second = await stand.app.send(navigation.flows.open, { window: SIDE, flowId: chatFlow(2), at: atOf(SIDE) });
	check("a second window is sent to the window that holds the flow", second.effects, [
		{ kind: "focus-window", window: "main" },
	]);
	check("and the hold is not stored", (await flowsIn(stand)).windowFlows[SIDE], undefined);
	await stand.app.send(navigation.flows.open, { window: MAIN, flowId: chatFlow(6), at: atOf(MAIN) });
	await stand.app.send(navigation.flows.open, { window: MAIN, flowId: chatFlow(5), at: atOf(MAIN) });
	check(
		"opening a failed chat reads it and leaves an asking chat as it is",
		(await stand.tabs.places()).tabs.tabs
			.filter(({ id }) => id === chatIdOf(5) || id === chatIdOf(6))
			.map(({ mark }) => mark),
		["none", "asking"],
	);
	check(
		"a flow that does not exist is refused",
		(
			await refusalOf(() =>
				stand.app.send(navigation.flows.open, { window: MAIN, flowId: "flow-none", at: atOf(MAIN) }),
			)
		).includes("no flow"),
		true,
	);
}

async function openPagesChecks(): Promise<void> {
	const stand = standOver(true, [WEB_APP]);
	const web = await stand.app.send(navigation.tabOpening.openTab, { at: atOf(MAIN, BROWSER_SCREEN), app: "web" });
	const flowId = (await flowsIn(stand)).flows.find((flow) => flowTabIdsOf(flow).includes(web.id))?.id ?? "";
	const page = (await stand.tabs.places()).tabs.tabs.find(({ id }) => id === web.id)?.pageId ?? null;
	const reopened = await stand.app.send(navigation.flows.open, {
		window: MAIN,
		flowId,
		at: atOf(MAIN, BROWSER_SCREEN),
	});
	check(
		"opening a flow answers the effect to open the page of each of its page tabs",
		reopened.effects.filter((effect) => effect.kind === "open-page").map((effect) => effect.pageId),
		[page],
	);
	const listed = await stand.app.send(navigation.flows.open, {
		window: MAIN,
		flowId,
		at: atOf(MAIN, {
			...BROWSER_SCREEN,
			pages: [
				{
					pageId: page ?? "",
					title: "Reading",
					url: "https://example.com",
					favicon: null,
					isInkReading: false,
					isAskWaiting: false,
					isClosedToInk: false,
					isInOwnWindow: false,
				},
			],
		}),
	});
	check("and none for a page that is open already", listed.effects, []);
}

function emptyFlow(): Flow {
	throw new Error("the flow is gone");
}

function paneOf(
	doc: FlowsDoc,
	flowId: string,
	paneId: string,
): { readonly tabIds: readonly string[]; readonly activeTabId: string | null } {
	const pane = flowPanesOf(doc.flows.find(({ id }) => id === flowId) ?? emptyFlow()).find(({ id }) => id === paneId);

	if (pane === undefined) {
		throw new Error(`the pane ${paneId} is gone`);
	}

	return pane;
}

async function openTabChecks(): Promise<void> {
	const stand = standOver(true, [WEB_APP]);
	const made = await stand.app.send(navigation.flows.create, {
		name: "Notes",
		place: { folderId: null, before: null },
	});
	const [bare] = flowPanesOf((await flowsIn(stand)).flows.find(({ id }) => id === made.flowId) ?? emptyFlow());
	const paneId = bare?.id ?? "";
	const homeIds = bare?.tabIds ?? [];
	const before = (await flowsIn(stand)).flows.length;
	await stand.app.send(navigation.flows.open, { window: MAIN, flowId: made.flowId, at: atOf(MAIN) });
	const first = await stand.app.send(navigation.flows.openTab, {
		window: MAIN,
		flowId: made.flowId,
		paneId,
		app: "canvas",
		address: null,
		at: atOf(MAIN),
	});
	const afterFirst = await flowsIn(stand);
	check(
		"a tab opened into the pane of a new flow stands after its Home tab, active",
		[paneOf(afterFirst, made.flowId, paneId).tabIds, paneOf(afterFirst, made.flowId, paneId).activeTabId],
		[[...homeIds, first.id], first.id],
	);
	check("and makes no new flow", afterFirst.flows.length, before);
	check("every law holds after the first tab", await lawsOf(stand), []);
	const second = await stand.app.send(navigation.flows.openTab, {
		window: MAIN,
		flowId: made.flowId,
		paneId,
		app: "web",
		address: "https://example.com",
		at: atOf(MAIN, BROWSER_SCREEN),
	});
	const page = (await stand.tabs.places()).tabs.tabs.find(({ id }) => id === second.id)?.pageId ?? null;
	check(
		"a second tab is appended and active, and a page app answers the effect to open its page",
		[
			paneOf(await flowsIn(stand), made.flowId, paneId).tabIds,
			second.effects.some((effect) => effect.kind === "open-page" && effect.pageId === page),
		],
		[[...homeIds, first.id, second.id], true],
	);
	await splitPaneChecks();
	await openTabRefusalChecks();
}

async function splitPaneChecks(): Promise<void> {
	const stand = standOver(true);
	const flowId = chatFlow(5);
	await stand.app.send(navigation.flows.open, { window: MAIN, flowId, at: atOf(MAIN) });
	const doc = await flowsIn(stand);
	const panes = flowPanesOf(doc.flows.find(({ id }) => id === flowId) ?? emptyFlow());
	const aimed = panes.find(({ id }) => id !== doc.flows.find((flow) => flow.id === flowId)?.layout.focusedPaneId);
	const opened = await stand.app.send(navigation.flows.openTab, {
		window: MAIN,
		flowId,
		paneId: aimed?.id ?? "",
		app: "canvas",
		address: null,
		at: atOf(MAIN),
	});
	const after = await flowsIn(stand);
	check(
		"in a split flow the tab goes to the aimed pane, and no other pane gains it",
		panes.map(({ id }) => paneOf(after, flowId, id).tabIds.includes(opened.id)),
		panes.map(({ id }) => id === aimed?.id),
	);
	check("and that pane takes the focus", after.flows.find(({ id }) => id === flowId)?.layout.focusedPaneId, aimed?.id);
	check("every law holds after the split flow gains a tab", await lawsOf(stand), []);
}

async function openTabRefusalChecks(): Promise<void> {
	const stand = standOver(true);
	const flowId = chatFlow(4);
	const [pane] = flowPanesOf((await flowsIn(stand)).flows.find(({ id }) => id === flowId) ?? emptyFlow());
	const ask = { window: MAIN, flowId, paneId: pane?.id ?? "", app: "canvas", address: null, at: atOf(MAIN) };
	check(
		"a pane that does not exist is refused",
		(await refusalOf(() => stand.app.send(navigation.flows.openTab, { ...ask, paneId: "pane-none" }))).includes(
			"no pane",
		),
		true,
	);
	await stand.app.send(navigation.flows.open, { window: SIDE, flowId, at: atOf(SIDE) });
	check(
		"a flow open in another window takes no tab",
		(await refusalOf(() => stand.app.send(navigation.flows.openTab, ask))).includes("open in window"),
		true,
	);
	const unconverted = standOver(false);
	check(
		"a workspace that is not converted refuses it",
		(await refusalOf(() => unconverted.app.send(navigation.flows.openTab, ask))).includes("not converted"),
		true,
	);
}

console.info = () => undefined;
console.warn = () => undefined;
console.error = () => undefined;
await openChecks();
await openPagesChecks();
await openTabChecks();
console.log(tally.failed ? `flows open: ${tally.failed} check(s) failed` : "flows open: all checks passed");
process.exit(tally.failed ? 1 : 0);
