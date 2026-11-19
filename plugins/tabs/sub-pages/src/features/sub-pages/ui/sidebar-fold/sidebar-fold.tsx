import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { SidebarMenuFold } from "@widgetarium/kit";
import { appHost } from "@widgetarium/app-host/contract";
import { chatEntryOf } from "../../lib/chat-entries.js";

export interface SidebarFoldProps {
	readonly tabId: string;
}

const FOLD = "Fold {title}";
const UNFOLD = "Unfold {title}";

export function SidebarFold({ tabId }: SidebarFoldProps): ReactElement | null {
	const sidebar = useQuery(appHost.tabs.tabsSidebar).data;
	const fold = useCommand(appHost.tabActions.foldTab);
	const chat = chatEntryOf(sidebar, tabId);

	if (chat === null || chat.artifacts.length === 0) {
		return null;
	}

	const isOpen = !(chat.isFolded ?? false);
	return (
		<SidebarMenuFold
			isOpen={isOpen}
			label={(isOpen ? FOLD : UNFOLD).replace("{title}", chat.tab.title)}
			onClick={() => void fold.run({ id: tabId })}
		/>
	);
}
