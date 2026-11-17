import { useOptionalQuery } from "@widgetarium/data-framework";
import { tabViews } from "@sumi/tab-views/contract";
import type { TabView } from "./tab-view.js";

export function useChosenView(views: readonly TabView[]): TabView | null {
	const chosen = useOptionalQuery(tabViews.views.chosen).data?.view ?? null;
	return views.find(({ id }) => id === chosen) ?? views[0] ?? null;
}
