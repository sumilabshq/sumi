import type { PlacedApps } from "./app-abilities.js";
import type { AppKind } from "../../schema/tabs.schema.js";
import { flatTabIdsOf, isSectionList, locationOf } from "./tab-lists.js";
import type { TabLayout } from "./tab-lists.js";

export interface PageListFacts extends TabLayout {
	readonly tabs: readonly { readonly id: string; readonly app: AppKind }[];
	readonly apps: PlacedApps;
}

export const SUB_PAGE_HOLDS_PAGES = "A sub-page can't hold sub-pages";

export const PAGE_WITH_SUB_PAGES = "A page with sub-pages can't be a sub-page";

export const PAGE_HOLDS_GROUP = "A page can't hold a group";

export function isMainPage(facts: PageListFacts, tabId: string): boolean {
	const location = locationOf(facts, tabId);
	return location !== null && isSectionList(location.chatId);
}

export function isPageList(facts: PageListFacts, listId: string): boolean {
	return facts.tabs.some((tab) => tab.id === listId) && isMainPage(facts, listId);
}

export function isPlaceableList(facts: PageListFacts, listId: string): boolean {
	return isSectionList(listId) || isPageList(facts, listId);
}

export function mainPageOf(facts: PageListFacts, tabId: string): string | null {
	const list = locationOf(facts, tabId)?.chatId ?? null;
	return list === null || isSectionList(list) ? null : list;
}

export function subPageIdsOf(facts: TabLayout, tabId: string): readonly string[] {
	return facts.lists[tabId] === undefined ? [] : flatTabIdsOf(facts, tabId);
}

export function withSubPagesOf(facts: TabLayout, ids: readonly string[]): readonly string[] {
	const subPages = ids.flatMap((id) => subPageIdsOf(facts, id));
	return [...new Set([...ids, ...subPages])];
}
