import { FlowsDocSchema } from "../plugins/tabs/navigation/data/navigation/shared/schema/flows.schema.ts";
import type { Flow, FlowsDoc } from "../plugins/tabs/navigation/data/navigation/shared/schema/flows.schema.ts";
import type { PlacedTabs } from "../plugins/tabs/navigation/data/navigation/shared/schema/tabs.schema.ts";
import { flowsOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/flows/flow-conversion.ts";
import type { FlowsConverted } from "../plugins/tabs/navigation/data/navigation/shared/lib/flows/flow-conversion.ts";
import { flowBreaksOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/flows/flow-laws.ts";
import { flowPanesOf, flowTabIdsOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/flows/flow-nodes.ts";
import { flowStatusOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/flows/flow-status.ts";
import { BUILT_IN_APPS } from "./placed-apps-fixture.ts";
import { MAIN_WINDOW, chatIdOf, fixturePlaced, mutatedPlaced } from "./flows-fixture.ts";
import type { FixtureMutation } from "./flows-fixture.ts";
import { check, tally } from "./check-helpers.ts";

const NOW = 1_700_000_000_000;
const SOURCE_REV = 6471;

const FIXTURE_MUTATIONS: readonly FixtureMutation[] = ["tab-twice", "tab-nowhere", "dangling-entry"];

function convert(placed: PlacedTabs): FlowsConverted {
	return flowsOf({ placed, apps: BUILT_IN_APPS, sourceRev: SOURCE_REV, now: NOW });
}

function converted(placed: PlacedTabs): { readonly doc: FlowsDoc; readonly said: readonly string[] } {
	const answer = convert(placed);

	if (answer.isRefused) {
		throw new Error(`the fixture was refused: ${answer.reasons.join("; ")}`);
	}

	return answer;
}

function flowOf(doc: FlowsDoc, id: string): Flow {
	const flow = doc.flows.find((one) => one.id === id);

	if (flow === undefined) {
		throw new Error(`no flow ${id}`);
	}

	return flow;
}

function countChecks(placed: PlacedTabs): void {
	const { doc } = converted(placed);
	const liveIds = placed.tabs.map(({ id }) => id);
	check("5 folders", doc.folders.length, 5);
	check("24 flows, 22 chat and 2 loose", doc.flows.length, 24);
	check(
		"45 tabs placed",
		doc.flows.reduce((sum, flow) => sum + flowTabIdsOf(flow).length, 0),
		45,
	);
	check("16 flows outside folders", doc.looseFlowIds.length, 16);
	check("22 chat flows", doc.flows.filter(({ id }) => id.startsWith("flow-chat-")).length, 22);
	check(
		"the loose flows are named after their groups",
		doc.flows.filter(({ id }) => id.startsWith("flow-loose-")).map(({ name }) => name),
		["MCP", "Refactoring"],
	);
	check("every law holds", flowBreaksOf(doc, liveIds), []);
	check("the doc matches its schema", FlowsDocSchema.safeParse(doc).success, true);
}

function rerunChecks(placed: PlacedTabs): void {
	const first = converted(placed);
	const second = converted(fixturePlaced());
	const reparsed = FlowsDocSchema.parse(JSON.parse(JSON.stringify(first.doc)));
	check("a rerun on the same input is identical", second.doc, first.doc);
	check("and so are its log lines", second.said, first.said);
	check("a stored and read doc is the same doc", reparsed, first.doc);
	check("the source digest is kept for the key", typeof first.doc.conversion?.sourceDigest, "string");
	check("the key keeps the revision it read", first.doc.conversion?.sourceRev, SOURCE_REV);
}

function folderChecks(placed: PlacedTabs): void {
	const { doc } = converted(placed);
	check(
		"folders follow the list order of the groups",
		doc.folders.map(({ id }) => id),
		["folder-group-89", "folder-group-90", "folder-group-93", "folder-group-99", "folder-group-147"],
	);
	check("an empty group stays an empty folder", doc.folders[0]?.flowIds, []);
	check(
		"a folder keeps its open state",
		doc.folders.map(({ isOpen }) => isOpen),
		[false, false, true, false, false],
	);
	check("a group's chats and its loose tabs share its folder", doc.folders[2]?.flowIds, [
		`flow-chat-${chatIdOf(18)}`,
		"flow-loose-group-93",
	]);
	check("the group's other tabs form one flow", flowTabIdsOf(flowOf(doc, "flow-loose-group-93")), ["tab-94", "tab-95"]);
}

function layoutChecks(placed: PlacedTabs): void {
	const { doc, said } = converted(placed);
	const split = flowOf(doc, `flow-chat-${chatIdOf(5)}`).layout.root;
	const dropped = flowOf(doc, `flow-chat-${chatIdOf(3)}`);
	check(
		"a saved split of two leaves becomes two panes with their shares",
		split.kind === "split" ? split.shares : null,
		[0.6, 0.4],
	);
	check(
		"a leaf of another flow is dropped, and said",
		said.some((line) => line.includes('"sub-1-1"')),
		true,
	);
	check(
		"the dropped leaf's tab stays in its own flow",
		flowTabIdsOf(flowOf(doc, `flow-chat-${chatIdOf(1)}`)).includes("sub-1-1"),
		true,
	);
	check(
		"sub-pages missing from the layout join the chat's pane",
		flowPanesOf(dropped).find((pane) => pane.tabIds.includes(chatIdOf(3)))?.tabIds,
		[chatIdOf(3), "sub-3-1", "sub-3-3"],
	);
	check("a chat with no saved layout gets one pane", flowPanesOf(flowOf(doc, `flow-chat-${chatIdOf(8)}`)).length, 1);
	check(
		"the focused pane holds the chat",
		flowPanesOf(dropped)
			.find(({ id }) => id === dropped.layout.focusedPaneId)
			?.tabIds.includes(chatIdOf(3)),
		true,
	);
	check(
		"the live window root becomes its chat's layout",
		flowPanesOf(flowOf(doc, `flow-chat-${chatIdOf(1)}`)).map(({ id }) => id),
		["pane-1"],
	);
}

function windowChecks(placed: PlacedTabs): void {
	const { doc } = converted(placed);
	check("a window shows the flow of its root chat", doc.windowFlows[MAIN_WINDOW], `flow-chat-${chatIdOf(1)}`);
}

function savedSplitChecks(placed: PlacedTabs): void {
	const withSplit: PlacedTabs = {
		...placed,
		splits: [
			{
				id: "split-1",
				memberIds: ["tab-94", "tab-95"],
				focusedId: "tab-94",
				layout: {
					kind: "branch",
					id: "branch-1",
					dir: "column",
					shares: [1, 2],
					children: [
						{ kind: "tab", tabId: "tab-94" },
						{ kind: "tab", tabId: "tab-95" },
					],
				},
			},
		],
		mintedSplits: 1,
	};
	const { doc } = converted(withSplit);
	const root = flowOf(doc, "flow-loose-group-93").layout.root;
	check("a saved split inside one flow becomes its layout", root.kind === "split" ? [root.dir, root.shares] : null, [
		"column",
		[1, 2],
	]);
	const acrossFlows: PlacedTabs = {
		...withSplit,
		splits: [{ ...(withSplit.splits[0] ?? never()), memberIds: ["tab-94", "tab-84"] }],
	};
	check(
		"a saved split across two flows is not a layout",
		flowOf(converted(acrossFlows).doc, "flow-loose-group-93").layout.root.kind,
		"pane",
	);
}

function never(): never {
	throw new Error("the fixture holds no saved split");
}

function statusChecks(): void {
	const chat = (mark: "none" | "running" | "asking" | "failed" | "unread"): { isChat: boolean; mark: typeof mark } => ({
		isChat: true,
		mark,
	});
	check("failed outranks asking", flowStatusOf([chat("asking"), chat("failed"), chat("unread")]), "failed");
	check("asking outranks running", flowStatusOf([chat("running"), chat("asking")]), "asking");
	check("running outranks unread", flowStatusOf([chat("unread"), chat("running")]), "running");
	check("unread alone", flowStatusOf([chat("none"), chat("unread")]), "unread");
	check("marks at none show no status", flowStatusOf([chat("none")]), null);
	check("no chat means no status", flowStatusOf([{ isChat: false, mark: "failed" }]), null);
	check("a flow with no tab shows no status", flowStatusOf([]), null);
	const placed = fixturePlaced();
	const { doc } = converted(placed);
	const statusOfFlow = (flow: Flow): string | null =>
		flowStatusOf(
			flowTabIdsOf(flow).flatMap((id) => {
				const tab = placed.tabs.find((one) => one.id === id);
				return tab === undefined ? [] : [{ isChat: tab.app === "chat", mark: tab.mark }];
			}),
		);
	check("the unread chat flow reads unread", statusOfFlow(flowOf(doc, `flow-chat-${chatIdOf(2)}`)), "unread");
	check("the running chat flow reads running", statusOfFlow(flowOf(doc, `flow-chat-${chatIdOf(3)}`)), "running");
	check("a flow of canvases only shows none", statusOfFlow(flowOf(doc, "flow-loose-group-90")), null);
}

function refusalChecks(): void {
	for (const mutation of FIXTURE_MUTATIONS) {
		const answer = convert(mutatedPlaced(mutation));
		const reason = answer.isRefused ? (answer.reasons[0] ?? "") : "";
		check(`a fixture mutated by ${mutation} is refused and writes nothing`, answer.isRefused, true);
		check(`and the old tabs are named as the cause for ${mutation}`, reason.startsWith("the old tabs break"), true);
	}
}

function lawChecks(placed: PlacedTabs): void {
	const { doc } = converted(placed);
	const liveIds = placed.tabs.map(({ id }) => id);
	const first = doc.flows[0];
	const second = doc.flows[1];

	if (first === undefined || second === undefined) {
		throw new Error("the fixture holds fewer than two flows");
	}

	const stolen: FlowsDoc = { ...doc, flows: [{ ...first, layout: second.layout }, ...doc.flows.slice(1)] };
	check("a tab in two flows breaks the laws", flowBreaksOf(stolen, liveIds).length > 0, true);
	check(
		"a flow in no place breaks the laws",
		flowBreaksOf({ ...doc, looseFlowIds: doc.looseFlowIds.slice(1) }, liveIds).length > 0,
		true,
	);
	check(
		"a flow in two places breaks the laws",
		flowBreaksOf({ ...doc, looseFlowIds: [...doc.looseFlowIds, ...doc.looseFlowIds.slice(0, 1)] }, liveIds).length > 0,
		true,
	);
	check("a tab placed in no flow breaks the laws", flowBreaksOf(doc, [...liveIds, "tab-ghost"]).length > 0, true);
}

function finish(): never {
	console.log(
		tally.failed ? `flows conversion: ${tally.failed} check(s) failed` : "flows conversion: all checks passed",
	);
	process.exit(tally.failed ? 1 : 0);
}

const mutation = FIXTURE_MUTATIONS.find((name) => name === process.env["FLOWS_FIXTURE_MUTATION"]);

if (mutation !== undefined) {
	check(`the fixture mutated by ${mutation} converts`, convert(mutatedPlaced(mutation)).isRefused, false);
	finish();
}

const placed = fixturePlaced();
countChecks(placed);
rerunChecks(placed);
folderChecks(placed);
layoutChecks(placed);
windowChecks(placed);
savedSplitChecks(placed);
statusChecks();
refusalChecks();
lawChecks(placed);
finish();
