import { FLOWS_DOC_V, WORKSPACE_TO_FLOWS_KEY } from "../../schema/flows.schema.js";
import type { Flow, FlowFolder, FlowLayout, FlowsDoc } from "../../schema/flows.schema.js";
import type { PaneNode, PaneTree } from "../../schema/pane-tree.schema.js";
import type { SplitNode } from "../../schema/splits.schema.js";
import type { PlacedTabs } from "../../schema/tabs.schema.js";
import { keptPanesOf } from "../panes/kept-panes.js";
import { isChatTab } from "../tabs/app-abilities.js";
import type { PlacedApps } from "../tabs/app-abilities.js";
import { momentOfWindow } from "../tabs/kept-tabs.js";
import { tabBreaksOf } from "../tabs/tab-invariants.js";
import { flatTabIdsOf, groupsUnder, isSectionList, tabIdsOfGroup } from "../tabs/tab-lists.js";
import type { TabGroup } from "../tabs/tab-lists.js";
import { chatFlowIdOf, folderIdOf, groupFlowIdOf, tabFlowIdOf } from "./flow-ids.js";
import { layoutOfPaneNode } from "./flow-layouts.js";
import type { FlowMembers } from "./flow-layouts.js";
import { flowBreaksOf } from "./flow-laws.js";
import { flowTabIdsOf } from "./flow-nodes.js";

export interface ConversionSource {
	readonly placed: PlacedTabs;
	readonly apps: PlacedApps;
	readonly sourceRev: number;
	readonly now: number;
}

export interface FlowCounts {
	readonly folders: number;
	readonly flows: number;
	readonly tabs: number;
	readonly outsideFolders: number;
}

export type FlowsConverted =
	| { readonly isRefused: true; readonly reasons: readonly string[] }
	| {
			readonly isRefused: false;
			readonly doc: FlowsDoc;
			readonly counts: FlowCounts;
			readonly said: readonly string[];
	  };

interface Context {
	readonly source: ConversionSource;
	readonly trees: readonly PaneTree[];
}

interface Owner {
	readonly groupId: string | null;
	readonly groupName: string;
}

interface Made {
	readonly flows: readonly Flow[];
	readonly said: readonly string[];
}

interface Part extends Made {
	readonly folder: FlowFolder | null;
}

interface FlowMade {
	readonly flow: Flow;
	readonly said: readonly string[];
}

const UNTITLED_FLOW = "Untitled";
const NO_OWNER: Owner = {
	groupId: null,
	groupName: "",
};
const EMPTY_PART: Part = {
	flows: [],
	said: [],
	folder: null,
};
const SOURCE_BREAKS = "the old tabs break their own laws, nothing converted: {reasons}";
const DOC_BREAKS = "the converted flows break their laws, nothing converted: {reasons}";
const NESTED_FLATTENED = 'the group "{id}" nested in "{holder}" was flattened into its folder';
const COUNTS_SAID =
	"workspace → flows: {folders} folders, {flows} flows, {tabs} tabs placed, {outside} flows outside folders";

export function flowsOf(source: ConversionSource): FlowsConverted {
	const { placed, apps } = source;
	const sourceBreaks = tabBreaksOf(momentOfWindow(placed, null, apps));

	if (sourceBreaks.length > 0) {
		return refusedWith(SOURCE_BREAKS, sourceBreaks);
	}

	const parts = partsOf({ source, trees: treesOf(placed) });
	const doc = docOf(source, parts);
	const docBreaks = flowBreaksOf(
		doc,
		placed.tabs.map(({ id }) => id),
	);

	if (docBreaks.length > 0) {
		return refusedWith(DOC_BREAKS, docBreaks);
	}

	const counts = flowCountsOf(doc);
	return {
		isRefused: false,
		doc,
		counts,
		said: [...parts.flatMap((part) => part.said), countsSaidOf(counts)],
	};
}

export function flowCountsOf(doc: FlowsDoc): FlowCounts {
	return {
		folders: doc.folders.length,
		flows: doc.flows.length,
		tabs: doc.flows.reduce((sum, flow) => sum + flowTabIdsOf(flow).length, 0),
		outsideFolders: doc.looseFlowIds.length,
	};
}

function refusedWith(template: string, reasons: readonly string[]): FlowsConverted {
	return {
		isRefused: true,
		reasons: [template.replace("{reasons}", reasons.join("; "))],
	};
}

function countsSaidOf(counts: FlowCounts): string {
	return COUNTS_SAID.replace("{folders}", String(counts.folders))
		.replace("{flows}", String(counts.flows))
		.replace("{tabs}", String(counts.tabs))
		.replace("{outside}", String(counts.outsideFolders));
}

function docOf({ placed, sourceRev, now }: ConversionSource, parts: readonly Part[]): FlowsDoc {
	const flows = parts.flatMap((part) => part.flows);
	return {
		v: FLOWS_DOC_V,
		flows,
		folders: parts.flatMap((part) => (part.folder === null ? [] : [part.folder])),
		looseFlowIds: parts.flatMap((part) => (part.folder === null ? part.flows.map(({ id }) => id) : [])),
		setups: [],
		windowFlows: windowFlowsOf(placed, flows),
		inboxUndo: null,
		conversion: {
			key: WORKSPACE_TO_FLOWS_KEY,
			sourceRev,
			sourceDigest: digestOf(placed),
			at: now,
		},
	};
}

function treesOf(placed: PlacedTabs): readonly PaneTree[] {
	return Object.keys(placed.views)
		.sort()
		.flatMap((window) => keptPanesOf(placed.views[window]?.panes) ?? []);
}

function partsOf(context: Context): readonly Part[] {
	const { lists } = context.source.placed;
	return Object.keys(lists)
		.filter(isSectionList)
		.flatMap((list) => lists[list] ?? [])
		.map((entry) => (entry.kind === "tab" ? partOfTab(entry.id, context) : partOfGroup(entry.id, context)));
}

function partOfTab(tabId: string, context: Context): Part {
	return {
		...flowsOfMainTabs([tabId], NO_OWNER, context),
		folder: null,
	};
}

function partOfGroup(groupId: string, context: Context): Part {
	const { groups } = context.source.placed;
	const group = groups.find(({ id }) => id === groupId);

	if (group === undefined) {
		return EMPTY_PART;
	}

	const made = flowsOfMainTabs(tabIdsOfGroup(groups, group), { groupId, groupName: group.name }, context);
	const flattened = groupsUnder(groups, group.entries).map(({ id }) =>
		NESTED_FLATTENED.replace("{id}", id).replace("{holder}", groupId),
	);
	return {
		flows: made.flows,
		said: [...made.said, ...flattened],
		folder: folderOf(group, made.flows),
	};
}

function folderOf(group: TabGroup, flows: readonly Flow[]): FlowFolder {
	return {
		id: folderIdOf(group.id),
		name: group.name,
		icon: null,
		color: group.hue,
		baseDir: null,
		isOpen: group.isOpen,
		flowIds: flows.map(({ id }) => id),
	};
}

function isChatId(tabId: string, { source }: Context): boolean {
	const tab = source.placed.tabs.find(({ id }) => id === tabId);
	return tab !== undefined && isChatTab(source.apps, tab);
}

function flowsOfMainTabs(mainIds: readonly string[], owner: Owner, context: Context): Made {
	const otherIds = mainIds.filter((id) => !isChatId(id, context));
	const made = mainIds.flatMap((id) => {
		if (isChatId(id, context)) {
			return [chatFlowOf(id, context)];
		}

		if (owner.groupId === null) {
			return [tabFlowOf(id, context)];
		}

		return id === otherIds[0] ? [groupFlowOf(otherIds, owner, context)] : [];
	});
	return {
		flows: made.map(({ flow }) => flow),
		said: made.flatMap(({ said }) => said),
	};
}

function chatFlowOf(chatId: string, context: Context): FlowMade {
	const flowId = chatFlowIdOf(chatId);
	const { layout, said } = layoutOfPaneNode(
		paneNodeOfChat(context.trees, chatId),
		membersOf(flowId, [chatId], context),
	);
	return {
		flow: flowOf({ id: flowId, name: flowNameOfTab(context.source.placed, chatId), layout }, context),
		said,
	};
}

function tabFlowOf(tabId: string, context: Context): FlowMade {
	const flowId = tabFlowIdOf(tabId);
	const members = membersOf(flowId, [tabId], context);
	const { layout, said } = layoutOfPaneNode(savedSplitOf(members, context), members);
	return {
		flow: flowOf({ id: flowId, name: flowNameOfTab(context.source.placed, tabId), layout }, context),
		said,
	};
}

function groupFlowOf(mainIds: readonly string[], owner: Owner, context: Context): FlowMade {
	const flowId = groupFlowIdOf(owner.groupId ?? "");
	const members = membersOf(flowId, mainIds, context);
	const { layout, said } = layoutOfPaneNode(savedSplitOf(members, context), members);
	return {
		flow: flowOf({ id: flowId, name: owner.groupName, layout }, context),
		said,
	};
}

function membersOf(flowId: string, mainIds: readonly string[], { source }: Context): FlowMembers {
	const layout = { lists: source.placed.lists, groups: source.placed.groups };
	return {
		flowId,
		mainTabId: mainIds[0] ?? "",
		tabIds: mainIds.flatMap((id) => [id, ...flatTabIdsOf(layout, id)]),
	};
}

interface FlowFacts {
	readonly id: string;
	readonly name: string;
	readonly layout: FlowLayout;
}

function flowOf({ id, name, layout }: FlowFacts, { source }: Context): Flow {
	return {
		id,
		name,
		icon: null,
		layout,
		createdAt: source.now,
		lastOpenedAt: source.now,
	};
}

export function flowNameOfTab(placed: PlacedTabs, tabId: string): string {
	const tab = placed.tabs.find(({ id }) => id === tabId);
	return tab?.label ?? tab?.title ?? UNTITLED_FLOW;
}

function paneNodeOfChat(trees: readonly PaneTree[], chatId: string): PaneNode | null {
	const live = trees.find((tree) => tree.root?.kind === "split" && tree.root.chatId === chatId)?.root;
	return live ?? trees.map((tree) => tree.shelved?.[chatId]).find((node) => node !== undefined) ?? null;
}

function savedSplitOf({ tabIds }: FlowMembers, { source }: Context): PaneNode | null {
	const saved = source.placed.splits.find(
		({ memberIds }) => memberIds.length > 0 && memberIds.every((id) => tabIds.includes(id)),
	);
	return saved === undefined ? null : paneNodeOfSplit(saved.layout, saved.id);
}

function paneNodeOfSplit(node: SplitNode, splitId: string): PaneNode {
	if (node.kind === "tab") {
		return {
			kind: "pane",
			id: `${splitId}-${node.tabId}`,
			view: {
				kind: "app",
				tabId: node.tabId,
			},
		};
	}

	return {
		kind: "split",
		id: node.id,
		dir: node.dir,
		children: node.children.map((child) => paneNodeOfSplit(child, splitId)),
		shares: node.shares,
	};
}

function windowFlowsOf(placed: PlacedTabs, flows: readonly Flow[]): Record<string, string> {
	const entries = Object.entries(placed.views).flatMap(([window, view]) => {
		const root = keptPanesOf(view.panes)?.root;
		const rootChatId = root?.kind === "split" ? root.chatId : undefined;
		const flowId = flowIdOfTab(flows, rootChatId) ?? flowIdOfTab(flows, view.shownId);
		return flowId === null ? [] : [[window, flowId] as const];
	});
	return Object.fromEntries(entries);
}

function flowIdOfTab(flows: readonly Flow[], tabId: string | null | undefined): string | null {
	if (tabId === null || tabId === undefined) {
		return null;
	}

	return flows.find((flow) => flowTabIdsOf(flow).includes(tabId))?.id ?? null;
}

function digestOf(value: unknown): string {
	const text = stableJsonOf(value);
	let first = 0xdeadbeef;
	let second = 0x41c6ce57;

	for (let at = 0; at < text.length; at += 1) {
		const code = text.charCodeAt(at);
		first = Math.imul(first ^ code, 2654435761);
		second = Math.imul(second ^ code, 1597334677);
	}

	first = Math.imul(first ^ (first >>> 16), 2246822507) ^ Math.imul(second ^ (second >>> 13), 3266489909);
	second = Math.imul(second ^ (second >>> 16), 2246822507) ^ Math.imul(first ^ (first >>> 13), 3266489909);
	return (4294967296 * (2097151 & second) + (first >>> 0)).toString(16);
}

function stableJsonOf(value: unknown): string {
	if (Array.isArray(value)) {
		return `[${value.map(stableJsonOf).join(",")}]`;
	}

	if (typeof value !== "object" || value === null) {
		return JSON.stringify(value);
	}

	const fields = Object.entries(value)
		.sort(([one], [other]) => (one < other ? -1 : 1))
		.map(([key, field]) => `${JSON.stringify(key)}:${stableJsonOf(field)}`);
	return `{${fields.join(",")}}`;
}
