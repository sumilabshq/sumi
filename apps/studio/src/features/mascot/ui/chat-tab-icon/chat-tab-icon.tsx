import { createElement as h, memo } from "react";
import type { ReactElement } from "react";
import { CHAT_TAB_LOOKS, CHAT_TAB_VIEW_BOX } from "../../lib/chat-tab-looks.js";
import type { ChatTabState } from "../../lib/chat-tab-state.schema.js";
import { ChatTabEye } from "./chat-tab-eye.js";

export const CHAT_TAB_ICON_HOST = "wg-chat-tab-icon-host";

export interface ChatTabIconProps {
	readonly state: ChatTabState;
}

export const ChatTabIcon = memo(function ChatTabIcon({ state }: ChatTabIconProps): ReactElement {
	const look = CHAT_TAB_LOOKS[state];
	const [left, right] = look.eyes;
	return (
		<span className="wg-chat-tab-icon" data-motion={look.motion} aria-hidden="true">
			<svg className="wg-chat-tab-icon-ink" viewBox={CHAT_TAB_VIEW_BOX}>
				<g className="wg-chat-tab-icon-gaze">
					<ChatTabEye {...left} />
					<ChatTabEye {...right} />
				</g>
				{look.mouth && <path className="wg-chat-tab-icon-stroke" d={look.mouth.d} strokeWidth={look.mouth.width} />}
			</svg>
		</span>
	);
});
