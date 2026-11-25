import { navigation } from "../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import { flowPanesOf, flowTabIdsOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/flows/flow-nodes.ts";
import { tabsMoveAsPlaces } from "../plugins/tabs/navigation/data/navigation/shared/lib/flows/flow-moves.ts";
import { moving } from "../plugins/tabs/navigation/data/navigation/shared/lib/settling/settling.ts";
import type { FlowsDoc } from "../plugins/tabs/navigation/data/navigation/shared/schema/flows.schema.ts";
import { keepChatTabsPlan } from "../plugins/ai/chat/data/chat-facts/features/turns/lib/turn-plans.ts";
import { BUILT_IN_APPS } from "./placed-apps-fixture.ts";
import { atOf } from "./flows-asks.ts";
import { MAIN, chatFlow, flowsIn, lawsOf, standOver } from "./flows-stand.ts";
import type { Stand } from "./flows-stand.ts";
import { check, tally } from "./check-helpers.ts";

const FLOW_ID = chatFlow(3);
const NEW_CHAT_ID = "chat-from-home";

interface HomeSpot {
	readonly stand: Stand;
	readonly homeId: string;
	readonly paneId: string;
	readonly at: number;
	readonly before: FlowsDoc;
}

interface Spot {
	readonly paneId: string;
	readonly at: number;
}

async function homeOpened(): Promise<HomeSpot> {
	const stand = standOver(true);
	await stand.app.send(navigation.flows.open, { window: MAIN, flowId: FLOW_ID, at: atOf(MAIN) });
	const paneId = flowPanesOf(flowIn(await flowsIn(stand)))[0]?.id ?? "";
	const ask = { window: MAIN, flowId: FLOW_ID, paneId, address: null, at: atOf(MAIN) };
	const home = await stand.app.send(navigation.flows.openTab, { ...ask, app: "home" });
	await stand.app.send(navigation.flows.openTab, { ...ask, app: "canvas" });
	await stand.app.send(navigation.flowPanes.showTab, { window: MAIN, flowId: FLOW_ID, tabId: home.id });
	const before = await flowsIn(stand);
	return { stand, homeId: home.id, paneId, at: spotOf(before, home.id)?.at ?? -1, before };
}

function flowIn(doc: FlowsDoc): FlowsDoc["flows"][number] {
	const flow = doc.flows.find(({ id }) => id === FLOW_ID);

	if (flow === undefined) {
		throw new Error(`the flow ${FLOW_ID} is gone`);
	}

	return flow;
}

function spotOf(doc: FlowsDoc, tabId: string): Spot | null {
	const pane = flowPanesOf(flowIn(doc)).find(({ tabIds }) => tabIds.includes(tabId));
	return pane === undefined ? null : { paneId: pane.id, at: pane.tabIds.indexOf(tabId) };
}

async function checkReplaced(home: HomeSpot, openedId: string, app: string): Promise<void> {
	const after = await flowsIn(home.stand);
	const { tabs } = (await home.stand.tabs.places()).tabs;
	const otherPanes = (doc: FlowsDoc): string =>
		JSON.stringify(flowPanesOf(flowIn(doc)).filter(({ id }) => id !== home.paneId));
	check(
		`${app} opened from a Home tab takes its pane and position, active`,
		[spotOf(after, openedId), flowPanesOf(flowIn(after)).find(({ id }) => id === home.paneId)?.activeTabId],
		[{ paneId: home.paneId, at: home.at }, openedId],
	);
	check(
		`and the ${app} tab exists, no Home tab is left in the host or in any flow`,
		[
			tabs.find(({ id }) => id === openedId)?.app,
			tabs.some((tab) => tab.app === "home"),
			after.flows.some((flow) => flowTabIdsOf(flow).includes(home.homeId) && home.homeId !== openedId),
		],
		[app, false, false],
	);
	check(
		`and the window keeps its Flow, its other panes and the flow count`,
		[after.windowFlows[MAIN], otherPanes(after), after.flows.length],
		[home.before.windowFlows[MAIN], otherPanes(home.before), home.before.flows.length],
	);
	check(`every law holds after ${app} replaces Home`, await lawsOf(home.stand), []);
}

async function chatReplacesHome(): Promise<void> {
	const home = await homeOpened();
	const chats = [{ id: NEW_CHAT_ID, title: null }];
	await home.stand.tabs.movePlaces(tabsMoveAsPlaces(moving(null, BUILT_IN_APPS, keepChatTabsPlan(chats))));
	const opened = await home.stand.app.send(navigation.tabOpening.navigate, {
		at: atOf(MAIN),
		target: { kind: "tab", id: NEW_CHAT_ID, isMoved: true },
		where: "this-tab",
		from: home.homeId,
	});
	await checkReplaced(home, opened.id, "chat");
}

async function canvasReplacesHome(): Promise<void> {
	const home = await homeOpened();
	const opened = await home.stand.app.send(navigation.tabOpening.navigate, {
		at: atOf(MAIN),
		target: { kind: "app", app: "canvas", address: "" },
		where: "this-tab",
		from: home.homeId,
	});
	await checkReplaced(home, opened.id, "canvas");
}

await chatReplacesHome();
await canvasReplacesHome();
console.log(tally.failed ? `flows home open: ${tally.failed} check(s) failed` : "flows home open: all checks passed");
process.exit(tally.failed ? 1 : 0);
