import type { z } from "zod";
import { flowOfId } from "../../../shared/lib/flows/flow-docs.js";
import type { PlacedPlaces } from "../../../shared/lib/flows/flow-moves.js";
import { flowTabIdsOf } from "../../../shared/lib/flows/flow-nodes.js";
import { isChatTab } from "../../../shared/lib/tabs/app-abilities.js";
import type { PlacedApps } from "../../../shared/lib/tabs/app-abilities.js";
import type { FlowBoardSchema } from "../../../shared/schema/flow-asks.schema.js";

type FlowBoard = z.infer<typeof FlowBoardSchema>;

export function flowBoardOf({ tabs, flows }: PlacedPlaces, apps: PlacedApps, flowId: string): FlowBoard | null {
	const flow = flows === null ? undefined : flowOfId(flows, flowId);

	if (flow === undefined) {
		return null;
	}

	const ids = new Set(flowTabIdsOf(flow));
	return {
		flowId,
		layout: flow.layout,
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
	};
}
