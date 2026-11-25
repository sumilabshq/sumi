import { labelOfPlacesWindow } from "@widgetarium/behaviors";
import type { Flow, FlowFolder, FlowStatus, FlowsDoc } from "../../schema/flows.schema.js";
import type { GroupHue, PlacedTabs } from "../../schema/tabs.schema.js";
import { isChatTab } from "../tabs/app-abilities.js";
import type { PlacedApps } from "../tabs/app-abilities.js";
import { isArchived } from "./flow-docs.js";
import { flowTabIdsOf } from "./flow-nodes.js";
import { projectIdOfFlow, projectIdOfFolder } from "./flow-projects.js";
import { flowStatusOf } from "./flow-status.js";

type KeptTab = PlacedTabs["tabs"][number];

export interface FlowChatRow {
	readonly id: string;
	readonly title: string | null;
	readonly status: FlowStatus | null;
}

export interface FlowRow {
	readonly id: string;
	readonly name: string;
	readonly icon: Flow["icon"];
	readonly status: FlowStatus | null;
	readonly chats: readonly FlowChatRow[];
	readonly isOpen: boolean;
	readonly lastOpenedAt: number;
	readonly projectId: string;
}

export interface FolderRow {
	readonly id: string;
	readonly name: string;
	readonly icon: FlowFolder["icon"];
	readonly color: GroupHue | null;
	readonly baseDir: string | null;
	readonly isOpen: boolean;
	readonly status: FlowStatus | null;
	readonly flows: readonly FlowRow[];
	readonly projectId: string;
}

export interface RowFacts {
	readonly placed: PlacedTabs;
	readonly doc: FlowsDoc;
	readonly apps: PlacedApps;
}

export function flowRowOf(flow: Flow, facts: RowFacts): FlowRow {
	const chats = chatTabsOf(flow, facts);
	return {
		id: flow.id,
		name: flow.name,
		icon: flow.icon,
		status: flowStatusOf(chats.map((tab) => ({ isChat: true, mark: tab.mark }))),
		chats: chats.map((tab) => ({
			id: tab.id,
			title: tab.label ?? tab.title,
			status: tab.mark === "none" ? null : tab.mark,
		})),
		isOpen: openFlowIdsOf(facts.placed, facts.doc).has(flow.id),
		lastOpenedAt: flow.lastOpenedAt,
		projectId: projectIdOfFlow(facts.doc, flow),
	};
}

export function folderRowOf(folder: FlowFolder, facts: RowFacts): FolderRow {
	const flows = folder.flowIds.flatMap((id) => {
		const flow = facts.doc.flows.find((one) => one.id === id);
		return flow === undefined || isArchived(flow) ? [] : [flowRowOf(flow, facts)];
	});
	return {
		id: folder.id,
		name: folder.name,
		icon: folder.icon,
		color: folder.color ?? null,
		baseDir: folder.baseDir,
		isOpen: folder.isOpen,
		status: flowStatusOf(flows.flatMap(({ status }) => (status === null ? [] : [{ isChat: true, mark: status }]))),
		flows,
		projectId: projectIdOfFolder(folder),
	};
}

export function chatTabsOf(flow: Flow, { placed, apps }: Pick<RowFacts, "placed" | "apps">): readonly KeptTab[] {
	const ids = new Set(flowTabIdsOf(flow));
	return placed.tabs.filter((tab) => ids.has(tab.id) && isChatTab(apps, tab));
}

export function openWindowsOf(placed: PlacedTabs, doc: FlowsDoc): ReadonlyMap<string, string> {
	const live = placed.windows.map((window) => window.label);
	const openedAt = new Map(placed.windows.map((window) => [window.label, window.openedAt]));
	const entries = Object.entries(doc.windowFlows)
		.filter(([window]) => live.includes(labelOfPlacesWindow(window)))
		.sort(
			([one], [other]) =>
				(openedAt.get(labelOfPlacesWindow(one)) ?? 0) - (openedAt.get(labelOfPlacesWindow(other)) ?? 0),
		);
	return new Map(entries);
}

export function openFlowIdsOf(placed: PlacedTabs, doc: FlowsDoc): ReadonlySet<string> {
	return new Set(openWindowsOf(placed, doc).values());
}

export function flowHolderOf(
	placed: PlacedTabs,
	doc: FlowsDoc,
	ask: { readonly flowId: string; readonly window: string },
): string | null {
	const holder = [...openWindowsOf(placed, doc)].find(
		([window, flowId]) => flowId === ask.flowId && window !== ask.window,
	);
	return holder?.[0] ?? null;
}
