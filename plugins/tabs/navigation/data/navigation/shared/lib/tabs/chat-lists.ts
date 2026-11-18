import { isChatTab } from "./app-abilities.js";
import type { PlacedApps } from "./app-abilities.js";
import type { AppKind } from "../../schema/tabs.schema.js";
import { flatTabIdsOf, isSectionList } from "./tab-lists.js";
import type { TabLayout } from "./tab-lists.js";

export interface ChatListFacts extends TabLayout {
	readonly tabs: readonly { readonly id: string; readonly app: AppKind }[];
	readonly apps: PlacedApps;
}

export const CHAT_HOLDS_CHAT = "A chat can't hold a chat";

export const CHAT_HOLDS_GROUP = "A chat can't hold a group";

export function isChatList(facts: Pick<ChatListFacts, "tabs" | "apps">, listId: string): boolean {
	return facts.tabs.some((tab) => tab.id === listId && isChatTab(facts.apps, tab));
}

export function isPlaceableList(facts: Pick<ChatListFacts, "tabs" | "apps">, listId: string): boolean {
	return isSectionList(listId) || isChatList(facts, listId);
}

export function artifactIdsOf(facts: ChatListFacts, chatTabId: string): readonly string[] {
	return isChatList(facts, chatTabId) ? flatTabIdsOf(facts, chatTabId) : [];
}

export function withArtifactsOf(facts: ChatListFacts, ids: readonly string[]): readonly string[] {
	const artifacts = ids.flatMap((id) => artifactIdsOf(facts, id));
	return [...new Set([...ids, ...artifacts])];
}
