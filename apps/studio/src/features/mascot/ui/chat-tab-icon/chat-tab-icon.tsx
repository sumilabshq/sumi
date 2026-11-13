import { createElement as h, memo } from "react";
import type { ReactElement } from "react";
import { SumiFigure } from "@sumi/sumi-host-plugin";
import type { SumiState } from "@sumi/sumi-host-plugin";
import type { ChatTabState } from "../../lib/chat-tab-state.schema.js";

export const CHAT_TAB_ICON_HOST = "wg-chat-tab-icon-host";

const ICON_PX = 14;

const LOOK_OF: Readonly<Record<ChatTabState, { readonly state: SumiState; readonly motion: string }>> = {
	idle: {
		state: "rest",
		motion: "blink",
	},
	working: {
		state: "working",
		motion: "bob",
	},
	done: {
		state: "done",
		motion: "still",
	},
	failed: {
		state: "error",
		motion: "still",
	},
};

export interface ChatTabIconProps {
	readonly state: ChatTabState;
}

export const ChatTabIcon = memo(function ChatTabIcon({ state }: ChatTabIconProps): ReactElement {
	const look = LOOK_OF[state];
	return (
		<span className="wg-chat-tab-icon" data-motion={look.motion} aria-hidden="true">
			<SumiFigure state={look.state} size={ICON_PX} />
		</span>
	);
});
