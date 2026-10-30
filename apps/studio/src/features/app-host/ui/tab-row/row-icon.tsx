import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { GroupItem } from "@widgetarium/app-host";
import { ChatTabIcon } from "../../../mascot/ui/chat-tab-icon/chat-tab-icon.js";
import { chatIconStateOf } from "../../lib/tabs-sidebar/chat-icon-state.js";
import { TabArt } from "../tab-face/tab-art.js";

export function RowIcon({ item }: { readonly item: GroupItem }): ReactElement {
	if (item.kind === "chat") {
		return <ChatTabIcon state={chatIconStateOf(item.chat.mark)} />;
	}

	const { tab } = item;
	return <TabArt icon={tab.icon} favicon={tab.favicon} title={tab.title} address={tab.address} size="row" />;
}
