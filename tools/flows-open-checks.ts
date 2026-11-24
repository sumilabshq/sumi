import { navigation } from "../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import { flowTabIdsOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/flows/flow-nodes.ts";
import { BROWSER_SCREEN, WEB_APP, atOf } from "./flows-asks.ts";
import { chatIdOf } from "./flows-fixture.ts";
import { MAIN, SIDE, chatFlow, flowsIn, refusalOf, standOver } from "./flows-stand.ts";
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

console.info = () => undefined;
console.warn = () => undefined;
console.error = () => undefined;
await openChecks();
await openPagesChecks();
console.log(tally.failed ? `flows open: ${tally.failed} check(s) failed` : "flows open: all checks passed");
process.exit(tally.failed ? 1 : 0);
