import type { ChatMark } from "@widgetarium/app-host/contract";
import type { ChatTabState } from "../../../mascot/lib/chat-tab-state.schema.js";

export function chatIconStateOf(mark: ChatMark): ChatTabState {
	return mark === "running" ? "working" : "idle";
}
