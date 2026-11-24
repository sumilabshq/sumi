import type { z } from "zod";
import { flowOfId, folderHolding } from "../../../shared/lib/flows/flow-docs.js";
import type { PlacedPlaces } from "../../../shared/lib/flows/flow-moves.js";
import { flowTabIdsOf } from "../../../shared/lib/flows/flow-nodes.js";
import { flowRowOf, folderRowOf } from "../../../shared/lib/flows/flow-rows.js";
import { isChatTab } from "../../../shared/lib/tabs/app-abilities.js";
import type { PlacedApps } from "../../../shared/lib/tabs/app-abilities.js";
import type { FlowDetailSchema, FlowsSidebarSchema } from "../../../shared/schema/flow-asks.schema.js";

type FlowsSidebar = z.infer<typeof FlowsSidebarSchema>;
type FlowDetail = z.infer<typeof FlowDetailSchema>;

const NOT_CONVERTED: FlowsSidebar = {
	isConverted: false,
	looseFlows: [],
	folders: [],
	windowFlowId: null,
};

export function sidebarOf({ tabs, flows }: PlacedPlaces, apps: PlacedApps, window: string): FlowsSidebar {
	if (flows === null) {
		return NOT_CONVERTED;
	}

	const facts = { placed: tabs, doc: flows, apps };
	return {
		isConverted: true,
		looseFlows: flows.looseFlowIds.flatMap((id) => {
			const flow = flowOfId(flows, id);
			return flow === undefined ? [] : [flowRowOf(flow, facts)];
		}),
		folders: flows.folders.map((folder) => folderRowOf(folder, facts)),
		windowFlowId: flows.windowFlows[window] ?? null,
	};
}

export function flowDetailOf({ tabs, flows }: PlacedPlaces, apps: PlacedApps, flowId: string): FlowDetail | null {
	const flow = flows === null ? undefined : flowOfId(flows, flowId);

	if (flows === null || flow === undefined) {
		return null;
	}

	const ids = new Set(flowTabIdsOf(flow));
	return {
		flow,
		tabs: tabs.tabs
			.filter((tab) => ids.has(tab.id))
			.map((tab) => ({
				id: tab.id,
				app: tab.app,
				title: tab.title,
				label: tab.label,
				address: tab.lastAddress,
				mark: tab.mark,
				isChat: isChatTab(apps, tab),
			})),
		folderId: folderHolding(flows, flowId)?.id ?? null,
	};
}
