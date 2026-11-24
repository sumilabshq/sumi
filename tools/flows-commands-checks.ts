import { runtime } from "../packages/shared/data-framework/src/index.ts";
import type { Runtime } from "../packages/shared/data-framework/src/index.ts";
import type { AnyRequest, InputArgs, OutputOf } from "../packages/shared/data-framework/src/request.ts";
import { navigation } from "../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import { MemoryTabsGateway } from "../plugins/tabs/navigation/data/navigation/gateways/tabs/memory.gateway.ts";
import { flowsOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/flows/flow-conversion.ts";
import { flowBreaksOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/flows/flow-laws.ts";
import { flowTabIdsOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/flows/flow-nodes.ts";
import type { FlowsDoc } from "../plugins/tabs/navigation/data/navigation/shared/schema/flows.schema.ts";
import type { PlacedTabs, TabMark } from "../plugins/tabs/navigation/data/navigation/shared/schema/tabs.schema.ts";
import { BUILT_IN_APPS } from "./placed-apps-fixture.ts";
import { BARE_SCREEN, placesOver } from "./places-fixture.ts";
import { MAIN_WINDOW, chatIdOf, fixturePlaced } from "./flows-fixture.ts";
import { check, tally } from "./check-helpers.ts";

const NOW = 1_700_000_000_000;
const MAIN = MAIN_WINDOW;
const SIDE = "studio-2@fixture";

const MARKED: Readonly<Record<string, TabMark>> = {
	[chatIdOf(5)]: "failed",
	[chatIdOf(6)]: "asking",
};

function seeded(): { readonly placed: PlacedTabs; readonly flows: FlowsDoc } {
	const base = fixturePlaced();
	const placed: PlacedTabs = {
		...base,
		tabs: base.tabs.map((tab) => ({ ...tab, mark: MARKED[tab.id] ?? tab.mark })),
		windows: [
			{ label: "main", openedAt: 1 },
			{ label: "studio-2", openedAt: 2 },
		],
	};
	const converted = flowsOf({ placed, apps: BUILT_IN_APPS, sourceRev: 1, now: NOW });

	if (converted.isRefused) {
		throw new Error(converted.reasons.join("; "));
	}

	return { placed, flows: converted.doc };
}

interface Asker {
	send<R extends AnyRequest>(request: R, ...asked: InputArgs<R>): Promise<OutputOf<R>>;
}

interface Stand {
	readonly tabs: MemoryTabsGateway;
	readonly app: Asker;
}

function askerOf(started: Runtime): Asker {
	return {
		async send(request, ...asked) {
			const answer = await started.send(request, ...asked);

			if (!answer.ok) {
				throw new Error(answer.reason);
			}

			return answer.output;
		},
	};
}

function standOver(withFlows: boolean): Stand {
	const { placed, flows } = seeded();
	const tabs = new MemoryTabsGateway(placed, undefined, undefined, withFlows ? flows : null, {
		apps: BUILT_IN_APPS,
		now: () => NOW,
	});
	return {
		tabs,
		app: askerOf(
			runtime()
				.imports(...placesOver(tabs))
				.start(),
		),
	};
}

async function lawsOf(stand: Stand): Promise<readonly string[]> {
	const { tabs, flows } = await stand.tabs.places();
	return flows === null
		? ["no flows"]
		: flowBreaksOf(
				flows,
				tabs.tabs.map(({ id }) => id),
			);
}

async function flowsIn(stand: Stand): Promise<FlowsDoc> {
	const { flows } = await stand.tabs.places();

	if (flows === null) {
		throw new Error("no flows");
	}

	return flows;
}

async function refusalOf(run: () => Promise<unknown>): Promise<string> {
	try {
		await run();
		return "";
	} catch (failure: unknown) {
		return failure instanceof Error ? failure.message : String(failure);
	}
}

function chatFlow(id: number): string {
	return `flow-chat-${chatIdOf(id)}`;
}

async function readChecks(): Promise<void> {
	const stand = standOver(true);
	const sidebar = await stand.app.send(navigation.flows.sidebar, { window: MAIN });
	check(
		"the sidebar lists the loose flows and the folders",
		[sidebar.isConverted, sidebar.looseFlows.length, sidebar.folders.length],
		[true, 16, 5],
	);
	check(
		"a flow carries its most urgent chat status",
		sidebar.looseFlows.slice(0, 6).map(({ status }) => status),
		[null, "unread", "running", null, "failed", "asking"],
	);
	check(
		"a closed folder shows the status of its flows",
		sidebar.folders.map(({ status }) => status),
		[null, null, null, null, null],
	);
	const detail = await stand.app.send(navigation.flows.one, { flowId: chatFlow(3) });
	check(
		"one flow answers its layout, tabs and folder",
		[detail?.flow.id, detail?.tabs.length, detail?.folderId],
		[chatFlow(3), 4, null],
	);
	check(
		"a flow that does not exist answers null",
		await stand.app.send(navigation.flows.one, { flowId: "flow-nope" }),
		null,
	);
	const unconverted = standOver(false);
	const empty = await unconverted.app.send(navigation.flows.sidebar, { window: MAIN });
	check(
		"a workspace that is not converted answers an empty, flagged sidebar",
		[empty.isConverted, empty.looseFlows.length],
		[false, 0],
	);
	check(
		"and refuses a flow command",
		(await refusalOf(() => unconverted.app.send(navigation.flows.rename, { id: chatFlow(1), name: "x" }))).includes(
			"not converted",
		),
		true,
	);
}

async function flowCommandChecks(): Promise<void> {
	const stand = standOver(true);
	const made = await stand.app.send(navigation.flows.create, {
		name: "Notes",
		place: { folderId: "folder-group-93", before: null },
	});
	const flows = await flowsIn(stand);
	check(
		"create adds an empty flow at the end of its folder",
		flows.folders.find(({ id }) => id === "folder-group-93")?.flowIds.at(-1),
		made.flowId,
	);
	check("the new flow is one empty pane", flows.flows.find(({ id }) => id === made.flowId)?.layout.root.kind, "pane");
	check("every law holds after create", await lawsOf(stand), []);
	check(
		"a missing folder is refused",
		(
			await refusalOf(() =>
				stand.app.send(navigation.flows.create, { name: "x", place: { folderId: "folder-none", before: null } }),
			)
		).includes("no folder"),
		true,
	);
	await stand.app.send(navigation.flows.rename, { id: made.flowId, name: "Reading" });
	await stand.app.send(navigation.flows.setIcon, { id: made.flowId, icon: { kind: "emoji", emoji: "book" } });
	const renamed = (await flowsIn(stand)).flows.find(({ id }) => id === made.flowId);
	check(
		"rename and setIcon change the flow",
		[renamed?.name, renamed?.icon],
		["Reading", { kind: "emoji", emoji: "book" }],
	);
	await stand.app.send(navigation.flows.move, { flowId: made.flowId, place: { folderId: null, before: chatFlow(2) } });
	const moved = await flowsIn(stand);
	check("move puts the flow before another, outside folders", moved.looseFlowIds.slice(0, 3), [
		chatFlow(1),
		made.flowId,
		chatFlow(2),
	]);
	check(
		"and takes it out of its folder",
		moved.folders.find(({ id }) => id === "folder-group-93")?.flowIds.includes(made.flowId),
		false,
	);
	check(
		"a move before a flow that stands elsewhere is refused",
		(
			await refusalOf(() =>
				stand.app.send(navigation.flows.move, { flowId: made.flowId, place: { folderId: null, before: "flow-none" } }),
			)
		).includes("not in the place"),
		true,
	);
	check("every law holds after the moves", await lawsOf(stand), []);
}

async function openChecks(): Promise<void> {
	const stand = standOver(true);
	const first = await stand.app.send(navigation.flows.open, { window: MAIN, flowId: chatFlow(2) });
	const { tabs, flows } = await stand.tabs.places();
	check(
		"open sets the flow of the window and answers no effect",
		[flows?.windowFlows[MAIN], first.effects],
		[chatFlow(2), []],
	);
	check("opening reads an unread chat", tabs.tabs.find(({ id }) => id === chatIdOf(2))?.mark, "none");
	const second = await stand.app.send(navigation.flows.open, { window: SIDE, flowId: chatFlow(2) });
	check("a second window is sent to the window that holds the flow", second.effects, [
		{ kind: "focus-window", window: "main" },
	]);
	check("and the hold is not stored", (await flowsIn(stand)).windowFlows[SIDE], undefined);
	await stand.app.send(navigation.flows.open, { window: MAIN, flowId: chatFlow(6) });
	await stand.app.send(navigation.flows.open, { window: MAIN, flowId: chatFlow(5) });
	check(
		"opening a failed chat reads it and leaves an asking chat as it is",
		(await stand.tabs.places()).tabs.tabs
			.filter(({ id }) => id === chatIdOf(5) || id === chatIdOf(6))
			.map(({ mark }) => mark),
		["none", "asking"],
	);
	check(
		"a flow that does not exist is refused",
		(await refusalOf(() => stand.app.send(navigation.flows.open, { window: MAIN, flowId: "flow-none" }))).includes(
			"no flow",
		),
		true,
	);
}

async function inboxChecks(): Promise<void> {
	const stand = standOver(true);
	const rows = await stand.app.send(navigation.inbox.rows, undefined);
	check(
		"the inbox lists failed, then asking, then unread, and no running",
		rows.rows.map(({ id, status }) => [id, status]),
		[
			[chatFlow(5), "failed"],
			[chatFlow(6), "asking"],
			[chatFlow(2), "unread"],
		],
	);
	await stand.app.send(navigation.flows.open, { window: MAIN, flowId: chatFlow(6) });
	check(
		"an asking flow is hidden only while it is open",
		(await stand.app.send(navigation.inbox.rows, undefined)).rows.map(({ id }) => id),
		[chatFlow(5), chatFlow(2)],
	);
	await stand.app.send(navigation.flows.open, { window: MAIN, flowId: chatFlow(1) });
	const cleared = await stand.app.send(navigation.inbox.clear, undefined);
	check("clear reads unread and failed, not asking", [...cleared.clearedTabIds].sort(), [chatIdOf(2), chatIdOf(5)]);
	check(
		"what is left in the inbox waits for an answer",
		(await stand.app.send(navigation.inbox.rows, undefined)).rows.map(({ id }) => id),
		[chatFlow(6)],
	);
	check("the undo is kept in the doc", (await flowsIn(stand)).inboxUndo?.clearId, cleared.clearId);
	await stand.app.send(navigation.flows.open, { window: MAIN, flowId: chatFlow(3) });
	const undone = await stand.app.send(navigation.inbox.undoClear, { clearId: cleared.clearId });
	check("undo restores the tabs still at none", [...undone.clearedTabIds].sort(), [chatIdOf(2), chatIdOf(5)]);
	check(
		"the inbox is back as it was",
		(await stand.app.send(navigation.inbox.rows, undefined)).rows.map(({ id }) => id),
		[chatFlow(5), chatFlow(6), chatFlow(2)],
	);
	check(
		"an undo cannot run twice",
		(await refusalOf(() => stand.app.send(navigation.inbox.undoClear, { clearId: cleared.clearId }))).includes(
			"nothing to undo",
		),
		true,
	);
}

async function undoSkipsMovedOnChecks(): Promise<void> {
	const stand = standOver(true);
	const cleared = await stand.app.send(navigation.inbox.clear, undefined);
	await stand.tabs.movePlacedTabs((now) => ({
		next: {
			...now,
			tabs: now.tabs.map((tab) => (tab.id === chatIdOf(2) ? { ...tab, mark: "running" as const } : tab)),
		},
		reason: "a turn starts",
		answer: null,
	}));
	const undone = await stand.app.send(navigation.inbox.undoClear, { clearId: cleared.clearId });
	check("undo leaves a tab that moved on since the clear", [...undone.clearedTabIds], [chatIdOf(5)]);
}

async function folderChecks(): Promise<void> {
	const stand = standOver(true);
	const made = await stand.app.send(navigation.folders.create, { name: "Research", baseDir: "/work" });
	await stand.app.send(navigation.folders.rename, { id: made.folderId, name: "Reading" });
	await stand.app.send(navigation.folders.setIcon, { id: made.folderId, icon: { kind: "icon", name: "book" } });
	await stand.app.send(navigation.folders.setBaseDir, { id: made.folderId, baseDir: null });
	await stand.app.send(navigation.folders.toggle, { id: made.folderId });
	const folder = (await flowsIn(stand)).folders.find(({ id }) => id === made.folderId);
	check(
		"a folder is made, renamed, given an icon, a base directory and toggled",
		[folder?.name, folder?.icon, folder?.baseDir, folder?.isOpen],
		["Reading", { kind: "icon", name: "book" }, null, false],
	);
	const before = await flowsIn(stand);
	await stand.app.send(navigation.folders.remove, { id: "folder-group-99" });
	const after = await flowsIn(stand);
	check("removing a folder spills its flows to the loose list", after.looseFlowIds.slice(-3), [
		chatFlow(19),
		chatFlow(20),
		chatFlow(21),
	]);
	check(
		"and loses no flow",
		[after.flows.length, after.folders.length],
		[before.flows.length, before.folders.length - 1],
	);
	check("every law holds after the folders change", await lawsOf(stand), []);
	check(
		"a folder that does not exist is refused",
		(await refusalOf(() => stand.app.send(navigation.folders.toggle, { id: "folder-none" }))).includes("no folder"),
		true,
	);
}

async function setupChecks(): Promise<void> {
	const stand = standOver(true);
	const saved = await stand.app.send(navigation.setups.saveFrom, { flowId: chatFlow(5), name: "Chat and pages" });
	const all = await stand.app.send(navigation.setups.all, undefined);
	check(
		"a setup is saved from a flow's layout",
		[
			all.setups.length,
			all.setups[0]?.root.kind,
			all.setups[0]?.root.kind === "split" ? all.setups[0].root.shares : null,
		],
		[1, "split", [0.6, 0.4]],
	);
	const before = (await stand.tabs.places()).tabs.tabs.length;
	const started = await stand.app.send(navigation.setups.start, {
		setupId: saved.setupId,
		place: { folderId: null, before: null },
	});
	const { tabs, flows } = await stand.tabs.places();
	const flow = flows?.flows.find(({ id }) => id === started.flowId);
	check(
		"start makes a flow with one new tab per setup tab",
		[tabs.tabs.length - before, flow === undefined ? 0 : flowTabIdsOf(flow).length],
		[5, 5],
	);
	check(
		"the new flow takes the setup's layout and name",
		[flow?.name, flow?.layout.root.kind],
		["Chat and pages", "split"],
	);
	check("every law holds after start", await lawsOf(stand), []);
	await stand.app.send(navigation.setups.remove, { setupId: saved.setupId });
	check("a setup is removed", (await stand.app.send(navigation.setups.all, undefined)).setups.length, 0);
	check(
		"starting a setup that does not exist is refused",
		(
			await refusalOf(() =>
				stand.app.send(navigation.setups.start, { setupId: "setup-none", place: { folderId: null, before: null } }),
			)
		).includes("no setup"),
		true,
	);
}

async function removeChecks(): Promise<void> {
	const stand = standOver(true);
	const at = { window: MAIN, screen: BARE_SCREEN };
	const before = (await stand.tabs.places()).tabs.tabs.length;
	await stand.app.send(navigation.flows.open, { window: SIDE, flowId: chatFlow(4) });
	check(
		"a flow open in another window is not removed",
		(await refusalOf(() => stand.app.send(navigation.flows.remove, { flowId: chatFlow(4), at }))).includes(
			"open in window",
		),
		true,
	);
	await stand.app.send(navigation.flows.remove, { flowId: chatFlow(8), at });
	const { tabs, flows } = await stand.tabs.places();
	check(
		"removing a flow closes its tabs",
		[before - tabs.tabs.length, flows?.flows.some(({ id }) => id === chatFlow(8))],
		[7, false],
	);
	check("and its place in the sidebar goes", flows?.looseFlowIds.includes(chatFlow(8)), false);
	check("every law holds after the removal", await lawsOf(stand), []);
}

async function adoptChecks(): Promise<void> {
	const stand = standOver(true);
	const adopted = await stand.app.send(navigation.flows.adoptChats, { chatIds: ["chat-99", chatIdOf(1), "chat-98"] });
	check("a chat without a tab is given one, a chat with a tab is not", [...adopted.adoptedIds], ["chat-99", "chat-98"]);
	const flows = await flowsIn(stand);
	check(
		"and a flow, outside any folder",
		[flows.looseFlowIds.includes("flow-chat-chat-99"), flows.looseFlowIds.includes("flow-chat-chat-98")],
		[true, true],
	);
	check("every law holds after the chats are adopted", await lawsOf(stand), []);
	const again = await stand.app.send(navigation.flows.adoptChats, { chatIds: ["chat-99"] });
	check("adopting again does nothing", [...again.adoptedIds], []);
}

async function reconcileChecks(): Promise<void> {
	const stand = standOver(true);
	const at = { window: MAIN, screen: BARE_SCREEN };
	const opened = await stand.app.send(navigation.tabOpening.openTab, { at, app: "canvas" });
	const flowsAfterOpen = await flowsIn(stand);
	check(
		"a tab opened by the old command stands in exactly one flow",
		flowsAfterOpen.flows.filter((flow) => flowTabIdsOf(flow).includes(opened.id)).length,
		1,
	);
	check("every law holds after an old open", await lawsOf(stand), []);
	await stand.app.send(navigation.tabClosing.closeTab, { at, id: "sub-1-1" });
	check(
		"a tab closed by the old command leaves its pane",
		flowTabIdsOf((await flowsIn(stand)).flows.find(({ id }) => id === chatFlow(1)) ?? emptyFlow()),
		[chatIdOf(1)],
	);
	await stand.app.send(navigation.tabClosing.closeTab, { at, id: chatIdOf(1) });
	check(
		"a flow whose last tab closed goes with it",
		(await flowsIn(stand)).flows.some(({ id }) => id === chatFlow(1)),
		false,
	);
	check("every law holds after the closes", await lawsOf(stand), []);
	const reopened = await stand.app.send(navigation.tabOpening.reopenClosed, { at, tabId: chatIdOf(1) });
	check(
		"a reopened tab is given a flow again",
		[reopened !== undefined, (await flowsIn(stand)).flows.some((flow) => flowTabIdsOf(flow).includes(chatIdOf(1)))],
		[true, true],
	);
	check("every law holds after the reopen", await lawsOf(stand), []);
}

function emptyFlow(): FlowsDoc["flows"][number] {
	throw new Error("the flow is gone");
}

console.info = () => undefined;
console.warn = () => undefined;
console.error = () => undefined;
await readChecks();
await flowCommandChecks();
await openChecks();
await inboxChecks();
await undoSkipsMovedOnChecks();
await folderChecks();
await setupChecks();
await removeChecks();
await adoptChecks();
await reconcileChecks();
console.log(tally.failed ? `flows commands: ${tally.failed} check(s) failed` : "flows commands: all checks passed");
process.exit(tally.failed ? 1 : 0);
