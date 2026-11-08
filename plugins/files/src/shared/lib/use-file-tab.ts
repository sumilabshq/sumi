import { places } from "@sumi/contract";
import { useOptionalQuery } from "@widgetarium/data-framework";

export interface FileTab {
	readonly path: string | null;
	readonly isRead: boolean;
}

export function useFileTab(tabId: string): FileTab {
	const tab = useOptionalQuery(places.tabFacts.appTab, { id: tabId }).data;
	const address = tab?.address ?? "";
	return {
		path: address === "" ? null : address,
		isRead: tab !== null,
	};
}
