import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { navigation } from "@widgetarium/navigation/contract";
import { useFlowWindow } from "@sumi/flow-strip-plugin";
import { recentFlowsOf } from "./recent-flows-of.js";
import type { RecentFlow } from "./recent-flows-of.js";

export interface RecentFlows {
	readonly flows: readonly RecentFlow[];
	open(flowId: string): void;
}

export function useRecentFlows(): RecentFlows {
	const window = useFlowWindow();
	const sidebar = useOptionalQuery(navigation.flows.sidebar, { window }).data;
	const openFlow = useCommand(appHost.flows.open);
	return {
		flows: sidebar === null ? [] : recentFlowsOf(sidebar),
		open: (flowId) => void openFlow.run({ flowId }),
	};
}
