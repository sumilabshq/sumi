import { createElement as h, memo } from "react";
import type { ReactElement } from "react";
import { SumiFigure } from "@sumi/sumi-host-plugin";
import type { SumiState } from "@sumi/sumi-host-plugin";
import type { ChatTabState } from "../../lib/chat-tab-state.schema.js";

export const CHAT_TAB_ICON_HOST = "wg-chat-tab-icon-host";

const ICON_PX = 14;

const FIGURE_OF: Readonly<Record<ChatTabState, SumiState>> = {
	idle: "rest",
	working: "working",
	done: "done",
	failed: "error",
};

export interface ChatTabIconProps {
	readonly state: ChatTabState;
}

export const ChatTabIcon = memo(function ChatTabIcon({ state }: ChatTabIconProps): ReactElement {
	return (
		<span className="wg-chat-tab-icon" aria-hidden="true">
			<SumiFigure state={FIGURE_OF[state]} size={ICON_PX} />
		</span>
	);
});
