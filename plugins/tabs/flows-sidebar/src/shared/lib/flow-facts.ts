import type { OutputOf } from "@widgetarium/data-framework";
import type { navigation } from "@widgetarium/navigation/contract";
import type { FlowPlace } from "./use-flow-acts.js";

export type FlowsSidebarFacts = OutputOf<typeof navigation.flows.sidebar>;
export type FlowRowFacts = FlowsSidebarFacts["looseFlows"][number];
export type FolderRowFacts = FlowsSidebarFacts["folders"][number];
export type ProjectFacts = FlowsSidebarFacts["projects"][number];
export type FlowChatFacts = FlowRowFacts["chats"][number];

export const NEW_SESSION = "New session";

export function newSessionPlaceOf(sidebar: FlowsSidebarFacts, projectId: string): FlowPlace {
	return {
		folderId: null,
		before: sidebar.looseFlows.find((flow) => flow.projectId === projectId)?.id ?? null,
		projectId,
	};
}
