import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { ChatMark, TabArt as TabArtName } from "@widgetarium/app-host";
import { ChatTabIcon } from "../../../mascot/ui/chat-tab-icon/chat-tab-icon.js";
import { chatIconStateOf } from "../../lib/tabs-sidebar/chat-icon-state.js";
import { TabArt } from "./tab-art.js";
import type { TabArtSize } from "./tab-art.js";

export interface TabFaceIconProps {
	readonly icon: TabArtName;
	readonly favicon: string | null;
	readonly title: string;
	readonly address: string | null;
	readonly mark: ChatMark;
	readonly size: TabArtSize;
}

const CHAT_ART = "chat";

export function TabFaceIcon({ icon, favicon, title, address, mark, size }: TabFaceIconProps): ReactElement {
	if (icon === CHAT_ART) {
		return <ChatTabIcon state={chatIconStateOf(mark)} />;
	}

	return <TabArt icon={icon} favicon={favicon} title={title} address={address} size={size} />;
}
