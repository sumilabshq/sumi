import { appHost } from "../plugins/tabs/navigation/data/app-host/generated/contract.ts";
import { workspaces } from "../packages/domain/workspaces/generated/contract.ts";
import { FIXTURE_WINDOW, sidebarWorldOf } from "./flows-sidebar-world.ts";
import type { SidebarWorld } from "./flows-sidebar-world.ts";
import { navigation } from "../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import { FlowsDocSchema } from "../plugins/tabs/navigation/data/navigation/shared/schema/flows.schema.ts";
import { flowPanesOf, flowTabIdsOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/flows/flow-nodes.ts";
import type {
	FlowFolder,
	FlowNode,
	FlowsDoc,
} from "../plugins/tabs/navigation/data/navigation/shared/schema/flows.schema.ts";
import { folderColorsFillMove } from "../plugins/tabs/navigation/data/navigation/shared/lib/flows/flow-moves.ts";
import { BARE_SCREEN } from "./places-fixture.ts";
import { atOf } from "./flows-asks.ts";
import { chatIdOf } from "./flows-fixture.ts";
import { MAIN, SIDE, chatFlow, flowsIn, lawsOf, refusalOf, standOver } from "./flows-stand.ts";
import type { Stand } from "./flows-stand.ts";
import { check, tally } from "./check-helpers.ts";

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
	await stand.app.send(navigation.flows.open, { window: MAIN, flowId: chatFlow(6), at: atOf(MAIN) });
	check(
		"an asking flow is hidden only while it is open",
		(await stand.app.send(navigation.inbox.rows, undefined)).rows.map(({ id }) => id),
		[chatFlow(5), chatFlow(2)],
	);
	await stand.app.send(navigation.flows.open, { window: MAIN, flowId: chatFlow(1), at: atOf(MAIN) });
	const cleared = await stand.app.send(navigation.inbox.clear, undefined);
	check("clear reads unread and failed, not asking", [...cleared.clearedTabIds].sort(), [chatIdOf(2), chatIdOf(5)]);
	check(
		"what is left in the inbox waits for an answer",
		(await stand.app.send(navigation.inbox.rows, undefined)).rows.map(({ id }) => id),
		[chatFlow(6)],
	);
	check("the undo is kept in the doc", (await flowsIn(stand)).inboxUndo?.clearId, cleared.clearId);
	await stand.app.send(navigation.flows.open, { window: MAIN, flowId: chatFlow(3), at: atOf(MAIN) });
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

const COLORED_FOLDERS = ["folder-group-89", "folder-group-90"];

function colorsStripped(flows: FlowsDoc): FlowsDoc {
	return {
		...flows,
		folders: flows.folders.map(({ color: _dropped, ...folder }): FlowFolder => folder),
	};
}

async function colorsOf(stand: Stand): Promise<readonly (string | null | undefined)[]> {
	const { folders } = await flowsIn(stand);
	return COLORED_FOLDERS.map((id) => folders.find((folder) => folder.id === id)?.color);
}

async function folderColorChecks(): Promise<void> {
	const converted = standOver(true);
	check("conversion carries each tab group's hue to its folder", await colorsOf(converted), ["orange", "blue"]);
	const stripped = standOver(true, [], colorsStripped);
	check("a folder converted before colors holds none", await colorsOf(stripped), [undefined, undefined]);
	const said = await stripped.tabs.movePlaces(folderColorsFillMove());
	check("the fill move takes each missing color from its source group", await colorsOf(stripped), ["orange", "blue"]);
	check(
		"and logs each before → after",
		said.includes('folder folder-group-90 color missing → blue (from tab group "group-90")'),
		true,
	);
	check("a second fill changes nothing", await stripped.tabs.movePlaces(folderColorsFillMove()), []);
	await stripped.app.send(navigation.folders.setColor, { id: "folder-group-90", color: null });
	check(
		"setColor to none is kept, never refilled",
		[(await colorsOf(stripped))[1], await stripped.tabs.movePlaces(folderColorsFillMove())],
		[null, []],
	);
	await stripped.app.send(navigation.folders.setColor, { id: "folder-group-90", color: "red" });
	const sidebar = await stripped.app.send(navigation.flows.sidebar, { window: MAIN });
	check(
		"the sidebar row carries the folder color",
		sidebar.folders.find(({ id }) => id === "folder-group-90")?.color,
		"red",
	);
	check(
		"setColor on a missing folder is refused",
		(
			await refusalOf(() => stripped.app.send(navigation.folders.setColor, { id: "folder-none", color: "red" }))
		).includes("no folder"),
		true,
	);
	const healing = standOver(true, [], colorsStripped);
	await healing.app.send(navigation.folders.toggle, { id: "folder-group-90" });
	check("any move heals missing colors on its way", await colorsOf(healing), ["orange", "blue"]);
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
	await stand.app.send(navigation.flows.open, { window: SIDE, flowId: chatFlow(4), at: atOf(SIDE) });
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

function splitIdsOf(node: FlowNode): string[] {
	return node.kind === "pane" ? [] : [node.id, ...node.children.flatMap(splitIdsOf)];
}

async function duplicateChecks(): Promise<void> {
	const stand = standOver(true);
	const warned: string[] = [];
	const warnBefore = console.warn;
	console.warn = (...said: unknown[]): void => void warned.push(said.map(String).join(" "));
	const at = { window: MAIN, screen: BARE_SCREEN };
	const source = chatFlow(3);
	const before = await stand.tabs.places();
	const original = before.flows?.flows.find(({ id }) => id === source);
	const copied = await stand.app.send(navigation.flows.duplicate, { flowId: source, at });
	const { tabs, flows } = await stand.tabs.places();
	const copy = flows?.flows.find(({ id }) => id === copied.flowId);
	const copyTabIds = copy === undefined ? [] : flowTabIdsOf(copy);
	check(
		"a duplicated flow is named copy and stands right after the original",
		[copy?.name, flows?.looseFlowIds.indexOf(copied.flowId), flows?.looseFlowIds.indexOf(source)],
		[`${original?.name} copy`, (flows?.looseFlowIds.indexOf(source) ?? -2) + 1, flows?.looseFlowIds.indexOf(source)],
	);
	check(
		"every tab of the copy is a new tab and the layout keeps its shape",
		[
			copyTabIds.length === (original === undefined ? -1 : flowTabIdsOf(original).length),
			copyTabIds.some((id) => original !== undefined && flowTabIdsOf(original).includes(id)),
			tabs.tabs.length - before.tabs.tabs.length,
			copy?.layout.root.kind === original?.layout.root.kind,
		],
		[true, false, copyTabIds.length, true],
	);
	console.warn = warnBefore;
	const layoutIds = (flow: typeof copy): string[] =>
		flow === undefined ? [] : [...flowPanesOf(flow).map(({ id }) => id), ...splitIdsOf(flow.layout.root)];
	const originalIds = original === undefined ? [] : layoutIds(original);
	const copyIds = layoutIds(copy);
	check(
		"a copy shares no pane or split id with the original, keeps its focus, and healing stays silent",
		[
			copyIds.length === originalIds.length,
			copyIds.some((id) => originalIds.includes(id)),
			copy !== undefined && flowPanesOf(copy).some(({ id }) => id === copy.layout.focusedPaneId),
			warned,
		],
		[true, false, true, []],
	);
	check("every law holds after the duplicate", await lawsOf(stand), []);
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

type Flow = FlowsDoc["flows"][number];

function withFlowEdited(flows: FlowsDoc, flowId: string, edit: (flow: Flow) => Flow): FlowsDoc {
	return { ...flows, flows: flows.flows.map((flow) => (flow.id === flowId ? edit(flow) : flow)) };
}

function withTabAddedToRoot(flow: Flow, tabId: string): Flow {
	const { root } = flow.layout;
	return root.kind === "pane"
		? { ...flow, layout: { ...flow.layout, root: { ...root, tabIds: [...root.tabIds, tabId] } } }
		: flow;
}

function withRootSplitInTwoSamePanes(flow: Flow): Flow {
	const { root } = flow.layout;

	if (root.kind !== "pane") {
		return flow;
	}

	const [first = "", ...rest] = root.tabIds;
	return {
		...flow,
		layout: {
			...flow.layout,
			root: {
				kind: "split",
				id: "split-healing",
				dir: "row",
				shares: [1, 1],
				children: [
					{ ...root, tabIds: [first], activeTabId: first },
					{ ...root, tabIds: rest, activeTabId: rest[0] ?? null },
				],
			},
		},
	};
}

async function afterAWrite(stand: Stand): Promise<{ readonly laws: readonly string[]; readonly flows: FlowsDoc }> {
	const refused = await refusalOf(() =>
		stand.tabs.movePlacedTabs((now) => ({
			next: { ...now, minted: now.minted + 1 },
			reason: "a chat mark",
			answer: null,
		})),
	);
	return { laws: refused === "" ? await lawsOf(stand) : [refused], flows: await flowsIn(stand) };
}

function holdersOf(flows: FlowsDoc, tabId: string): readonly string[] {
	return flows.flows.filter((flow) => flowTabIdsOf(flow).includes(tabId)).map(({ id }) => id);
}

async function healingChecks(): Promise<void> {
	const twoPanes = await afterAWrite(
		standOver(true, [], (flows) => withFlowEdited(flows, chatFlow(2), (flow) => withTabAddedToRoot(flow, chatIdOf(1)))),
	);
	check(
		"a tab in two panes heals into its first pane on the next write",
		[twoPanes.laws, holdersOf(twoPanes.flows, chatIdOf(1))],
		[[], [chatFlow(1)]],
	);

	const repeatedFlow = await afterAWrite(
		standOver(true, [], (flows) => ({
			...flows,
			flows: [...flows.flows, ...flows.flows.filter(({ id }) => id === chatFlow(3))],
		})),
	);
	check(
		"a repeated flow id heals to one flow",
		[repeatedFlow.laws, repeatedFlow.flows.flows.filter(({ id }) => id === chatFlow(3)).length],
		[[], 1],
	);

	const repeatedPane = await afterAWrite(
		standOver(true, [], (flows) => withFlowEdited(flows, chatFlow(1), withRootSplitInTwoSamePanes)),
	);
	const healedFlow = repeatedPane.flows.flows.find(({ id }) => id === chatFlow(1)) ?? emptyFlow();
	check(
		"a repeated pane id heals to two panes with their tabs",
		[
			repeatedPane.laws,
			new Set(flowPanesOf(healedFlow).map(({ id }) => id)).size,
			holdersOf(repeatedPane.flows, chatIdOf(1)),
		],
		[[], 2, [chatFlow(1)]],
	);

	const twoPlaces = await afterAWrite(
		standOver(true, [], (flows) => ({
			...flows,
			folders: flows.folders.map((folder, at) =>
				at === 0 ? { ...folder, flowIds: [...folder.flowIds, chatFlow(1)] } : folder,
			),
		})),
	);
	check(
		"a flow in two places heals into its first place",
		[
			twoPlaces.laws,
			twoPlaces.flows.looseFlowIds.includes(chatFlow(1)),
			twoPlaces.flows.folders[0]?.flowIds.includes(chatFlow(1)),
		],
		[[], true, false],
	);

	const seededFolders = (await flowsIn(standOver(true))).folders.length;
	const repeatedFolder = await afterAWrite(
		standOver(true, [], (flows) => ({
			...flows,
			folders: [...flows.folders, ...flows.folders.slice(0, 1).map((folder) => ({ ...folder, flowIds: [] }))],
		})),
	);
	check(
		"a repeated folder id heals into one folder",
		[repeatedFolder.laws, repeatedFolder.flows.folders.length],
		[[], seededFolders],
	);

	const warned: string[] = [];
	console.warn = (...said: unknown[]): void => void warned.push(said.map(String).join(" "));
	const strayStand = standOver(true);
	const strayRefused = await refusalOf(() =>
		strayStand.tabs.movePlacedTabs((now) => ({
			next: {
				...now,
				tabs: [...now.tabs, { ...(now.tabs.find(({ id }) => id === "tab-94") ?? never()), id: "tab-stray" }],
			},
			reason: "a tab no old list holds",
			answer: null,
		})),
	);
	console.warn = () => undefined;
	check(
		"a stray the old tab laws refuse to convert gets a flow of its own",
		[strayRefused, await lawsOf(strayStand), holdersOf(await flowsIn(strayStand), "tab-stray")],
		["", [], ["flow-tab-tab-stray"]],
	);
	check(
		"and the healing is logged with its reason",
		warned.some((line) => line.includes("tab-stray") && line.includes("refuse conversion")),
		true,
	);
}

async function removeNoOpCloseChecks(): Promise<void> {
	const ghost = "flow-ghost";
	const stand = standOver(true, [], (flows) => ({
		...flows,
		flows: [
			...flows.flows,
			{
				...(flows.flows[0] ?? emptyFlow()),
				id: ghost,
				layout: {
					root: { kind: "pane", id: "pane-ghost", tabIds: ["tab-ghost"], activeTabId: "tab-ghost" },
					focusedPaneId: "pane-ghost",
					minted: 0,
				},
			},
		],
		looseFlowIds: [...flows.looseFlowIds, ghost],
	}));
	const refused = await refusalOf(() =>
		stand.app.send(navigation.flows.remove, { flowId: ghost, at: { window: MAIN, screen: BARE_SCREEN } }),
	);
	check(
		"a flow whose tabs cannot close is refused, never reported removed while it stays",
		[refused.includes("holds no tab"), (await flowsIn(stand)).flows.some(({ id }) => id === ghost)],
		[true, true],
	);
}

async function archiveChecks(): Promise<void> {
	const stand = standOver(true);
	const flowId = chatFlow(2);
	const at = atOf(MAIN);
	const tabsBefore = (await stand.tabs.places()).tabs.tabs.length;
	const inInbox = async (): Promise<boolean> =>
		(await stand.app.send(navigation.inbox.rows, undefined)).rows.some(({ id }) => id === flowId);
	const inSidebar = async (): Promise<boolean> =>
		(await stand.app.send(navigation.flows.sidebar, { window: MAIN })).looseFlows.some(({ id }) => id === flowId);
	check(
		"a flow with an unread chat shows in the sidebar and the inbox",
		[await inSidebar(), await inInbox()],
		[true, true],
	);
	await stand.app.send(navigation.flows.archive, { flowId });
	check(
		"archive leaves the flow out of the sidebar and the inbox",
		[await inSidebar(), await inInbox()],
		[false, false],
	);
	const archived = await stand.app.send(navigation.flows.archived, undefined);
	check(
		"flows.archived lists it with archivedAt",
		[archived.flows.map(({ id }) => id), (archived.flows[0]?.archivedAt ?? 0) > 0],
		[[flowId], true],
	);
	check(
		"an archived flow keeps its tabs and layout in the doc",
		[(await stand.tabs.places()).tabs.tabs.length, (await flowsIn(stand)).flows.some(({ id }) => id === flowId)],
		[tabsBefore, true],
	);
	check(
		"an archived flow cannot be opened",
		(await refusalOf(() => stand.app.send(navigation.flows.open, { window: MAIN, flowId, at }))).includes("archived"),
		true,
	);
	await stand.app.send(navigation.flows.unarchive, { flowId });
	check("unarchive brings it back to the sidebar and the inbox", [await inSidebar(), await inInbox()], [true, true]);
	check("and empties flows.archived", (await stand.app.send(navigation.flows.archived, undefined)).flows, []);
	check("every law holds after archive and unarchive", await lawsOf(stand), []);
	const { archivedAt: _dropped, ...oldFlow } = (await flowsIn(stand)).flows[0] ?? emptyFlow();
	const old = FlowsDocSchema.parse({ ...(await flowsIn(stand)), flows: [oldFlow] });
	check("a doc written before archivedAt reads it as null", old.flows[0]?.archivedAt, null);
}

async function closedOfTabs(stand: Stand, ids: ReadonlySet<string>): Promise<number> {
	return (await stand.tabs.places()).tabs.closed.filter(({ tab }) => ids.has(tab.id)).length;
}

async function deleteChecks(): Promise<void> {
	const at = { window: MAIN, screen: BARE_SCREEN };
	const removed = standOver(true);
	const deleted = standOver(true);
	const flow = (await flowsIn(removed)).flows.find(({ id }) => id === chatFlow(8)) ?? emptyFlow();
	const ids = new Set(flowTabIdsOf(flow));
	const before = await closedOfTabs(removed, ids);
	await removed.app.send(navigation.flows.remove, { flowId: chatFlow(8), at });
	await deleted.app.send(navigation.flows.deleteFlow, { flowId: chatFlow(8), at });
	const { tabs, flows } = await deleted.tabs.places();
	check("remove keeps the closed tabs of the flow in the history", [before, await closedOfTabs(removed, ids)], [0, 7]);
	check(
		"delete removes the flow, its tabs and its closed entries",
		[flows?.flows.some(({ id }) => id === chatFlow(8)), tabs.tabs.length, await closedOfTabs(deleted, ids)],
		[false, (await removed.tabs.places()).tabs.tabs.length, 0],
	);
	check("every law holds after delete", await lawsOf(deleted), []);
}

async function chatIdsIn(world: SidebarWorld): Promise<readonly string[]> {
	const records = await world.app.send(workspaces.chats.chatRecords, undefined);
	return records.ok ? records.output.chats.map(({ id }) => id) : [];
}

async function sidebarNamesIn(world: SidebarWorld): Promise<readonly string[]> {
	const sidebar = await world.app.send(navigation.flows.sidebar, { window: FIXTURE_WINDOW });
	return sidebar.ok
		? [...sidebar.output.looseFlows, ...sidebar.output.folders.flatMap(({ flows }) => flows)].map(({ name }) => name)
		: [];
}

async function folderDeleteChecks(): Promise<void> {
	const world = await sidebarWorldOf("quiet");
	const chatsBefore = await chatIdsIn(world);
	const deleted = await world.app.send(appHost.flows.deleteFolder, { folderId: "sumi" });
	const names = await sidebarNamesIn(world);
	check("deleting a folder with its flows answers ok", deleted.ok, true);
	check(
		"it removes the folder and all three flows",
		[names.includes("Composer redesign"), names.includes("Design system"), names.includes("Plugin layout")],
		[false, false, false],
	);
	check("and leaves the other flows", names.includes("Sprint board"), true);
	const sidebar = await world.app.send(navigation.flows.sidebar, { window: FIXTURE_WINDOW });
	check("and the folder", sidebar.ok && sidebar.output.folders.some(({ id }) => id === "sumi"), false);
	const chatsAfter = await chatIdsIn(world);
	check("each chat of those flows is deleted through deleteChat", chatsBefore.length - chatsAfter.length, 5);
	check("and no other chat", chatsAfter.includes("sprint-board-0"), true);
}

async function ungroupChecks(): Promise<void> {
	const world = await sidebarWorldOf("quiet");
	await world.app.send(navigation.folders.remove, { id: "client-project" });
	const sidebar = await world.app.send(navigation.flows.sidebar, { window: FIXTURE_WINDOW });
	check(
		"ungroup removes the folder and keeps its flow loose",
		sidebar.ok && [
			sidebar.output.folders.some(({ id }) => id === "client-project"),
			sidebar.output.looseFlows.some(({ name }) => name === "Sprint board"),
		],
		[false, true],
	);
	check("and keeps its chat", (await chatIdsIn(world)).includes("sprint-board-0"), true);
}

async function moveBeforeItselfChecks(): Promise<void> {
	const stand = standOver(true);
	const before = (await flowsIn(stand)).looseFlowIds;
	await stand.app.send(navigation.flows.move, { flowId: chatFlow(2), place: { folderId: null, before: chatFlow(2) } });
	check("moving a flow before itself leaves it where it stands", (await flowsIn(stand)).looseFlowIds, before);
}

function never(): never {
	throw new Error("the fixture holds no tab-94");
}

function emptyFlow(): FlowsDoc["flows"][number] {
	throw new Error("the flow is gone");
}

console.info = () => undefined;
console.warn = () => undefined;
console.error = () => undefined;
await readChecks();
await flowCommandChecks();
await inboxChecks();
await undoSkipsMovedOnChecks();
await folderChecks();
await folderColorChecks();
await setupChecks();
await removeChecks();
await duplicateChecks();
await adoptChecks();
await reconcileChecks();
await healingChecks();
await removeNoOpCloseChecks();
await moveBeforeItselfChecks();
await archiveChecks();
await deleteChecks();
await folderDeleteChecks();
await ungroupChecks();
console.log(tally.failed ? `flows commands: ${tally.failed} check(s) failed` : "flows commands: all checks passed");
process.exit(tally.failed ? 1 : 0);
