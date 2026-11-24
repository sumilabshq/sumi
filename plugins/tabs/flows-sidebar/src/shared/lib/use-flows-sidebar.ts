import { useQuery } from "@widgetarium/data-framework";
import { navigation } from "@widgetarium/navigation/contract";
import type { FlowsSidebarFacts } from "./flow-facts.js";
import { useFlowsWindow } from "./use-flows-window.js";

export function useFlowsSidebar(): FlowsSidebarFacts {
	const placesWindow = useFlowsWindow();
	return useQuery(navigation.flows.sidebar, { window: placesWindow }).data;
}
