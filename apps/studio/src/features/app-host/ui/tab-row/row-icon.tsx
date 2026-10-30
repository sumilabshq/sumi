import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { SidebarTab } from "@widgetarium/app-host";
import { ChatTabIcon } from "../../../mascot/ui/chat-tab-icon/chat-tab-icon.js";
import { chatIconStateOf } from "../../lib/tabs-sidebar/chat-icon-state.js";
import { TabArt } from "../tab-face/tab-art.js";

const CHAT_ART = "chat";

export function RowIcon({ item }: { readonly item: SidebarTab }): ReactElement {
	const { tab } = item;

	if (tab.icon === CHAT_ART) {
		return <ChatTabIcon state={chatIconStateOf(tab.mark)} />;
	}

	return <TabArt icon={tab.icon} favicon={tab.favicon} title={tab.title} address={tab.address} size="row" />;
}
