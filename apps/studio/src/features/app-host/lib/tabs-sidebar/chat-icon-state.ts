import type { ChatMark } from "@widgetarium/app-host";
import type { ChatTabState } from "../../../mascot/lib/chat-tab-state.schema.js";

const ICON_STATE_OF: Readonly<Record<ChatMark, ChatTabState>> = {
	none: "idle",
	running: "working",
	unread: "done",
};

export function chatIconStateOf(mark: ChatMark): ChatTabState {
	return ICON_STATE_OF[mark];
}
