import type { OutputOf } from "@widgetarium/data-framework";
import type { navigation } from "@widgetarium/navigation/contract";

export type FlowsSidebarFacts = OutputOf<typeof navigation.flows.sidebar>;
export type FlowRowFacts = FlowsSidebarFacts["looseFlows"][number];
export type FolderRowFacts = FlowsSidebarFacts["folders"][number];
export type FlowChatFacts = FlowRowFacts["chats"][number];
