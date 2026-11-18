import { createElement as h, memo } from "react";
import type { ReactElement } from "react";
import { StatusCube } from "@widgetarium/kit";
import type { StatusCubeState } from "@widgetarium/kit";
import type { ChatTabState } from "../../lib/chat-tab-state.schema.js";

export const CHAT_TAB_ICON_HOST = "wg-chat-tab-icon-host";

const ICON_PX = 14;

const CUBE_OF: Readonly<Record<ChatTabState, StatusCubeState>> = {
	idle: "idle",
	working: "working",
	done: "done",
	failed: "blocked",
};

export interface ChatTabIconProps {
	readonly state: ChatTabState;
}

export const ChatTabIcon = memo(function ChatTabIcon({ state }: ChatTabIconProps): ReactElement {
	return (
		<span className="wg-chat-tab-icon" aria-hidden="true">
			<StatusCube state={CUBE_OF[state]} size={ICON_PX} />
		</span>
	);
});
