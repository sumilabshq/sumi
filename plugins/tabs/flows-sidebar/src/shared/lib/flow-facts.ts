import type { OutputOf } from "@widgetarium/data-framework";
import type { navigation } from "@widgetarium/navigation/contract";
import type { FlowPlace, TopRef } from "./use-flow-acts.js";

export type FlowsSidebarFacts = OutputOf<typeof navigation.flows.sidebar>;
export type FlowRowFacts = FlowsSidebarFacts["looseFlows"][number];
export type FolderRowFacts = FlowsSidebarFacts["folders"][number];
export type ProjectFacts = FlowsSidebarFacts["projects"][number];
export type FlowChatFacts = FlowRowFacts["chats"][number];

export const NEW_SESSION = "New session";

export function placeBeforeOf(projectId: string, before: TopRef | null): FlowPlace {
	if (before?.kind === "folder") {
		return { folderId: null, before: null, beforeFolder: before.id, projectId };
	}

	return { folderId: null, before: before?.id ?? null, projectId };
}

export function newSessionPlaceOf(sidebar: FlowsSidebarFacts, projectId: string): FlowPlace {
	return placeBeforeOf(projectId, sidebar.projects.find(({ id }) => id === projectId)?.items[0] ?? null);
}
