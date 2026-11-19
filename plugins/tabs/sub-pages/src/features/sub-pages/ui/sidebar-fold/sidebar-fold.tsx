import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { SidebarMenuFold } from "@widgetarium/kit";
import { appHost } from "@widgetarium/app-host/contract";
import { pageEntryOf } from "../../lib/page-entries.js";

export interface SidebarFoldProps {
	readonly tabId: string;
}

const FOLD = "Fold {title}";
const UNFOLD = "Unfold {title}";

export function SidebarFold({ tabId }: SidebarFoldProps): ReactElement | null {
	const sidebar = useQuery(appHost.tabs.tabsSidebar).data;
	const fold = useCommand(appHost.tabActions.foldTab);
	const page = pageEntryOf(sidebar, tabId);

	if (page === null || page.subPages.length === 0) {
		return null;
	}

	const isOpen = !(page.isFolded ?? false);
	const isInFocus = page.tab.isShown || page.subPages.some(({ tab }) => tab.isShown);
	return (
		<SidebarMenuFold
			isOpen={isOpen}
			showOnHover={!isInFocus}
			label={(isOpen ? FOLD : UNFOLD).replace("{title}", page.tab.title)}
			onClick={() => void fold.run({ id: tabId })}
		/>
	);
}
