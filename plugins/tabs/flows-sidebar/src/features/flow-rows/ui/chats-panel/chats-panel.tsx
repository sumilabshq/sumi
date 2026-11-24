import { createElement as h } from "react";
import type { ReactElement } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@widgetarium/kit";
import type { FlowChatFacts } from "../../../../shared/lib/flow-facts.js";
import { StatusMark } from "../../../../shared/ui/status-mark/status-mark.js";

const CHATS_PANEL_DELAY_MS = 300;
const PANEL_GAP_PX = 8;
const UNTITLED_CHAT = "Untitled chat";

export interface ChatsHoverProps {
	readonly chats: readonly FlowChatFacts[];
	readonly children: ReactElement;
}

export function ChatsHover({ chats, children }: ChatsHoverProps): ReactElement {
	if (chats.length < 2) {
		return children;
	}

	return (
		<HoverCard openDelay={CHATS_PANEL_DELAY_MS}>
			<HoverCardTrigger asChild>{children}</HoverCardTrigger>
			<HoverCardContent side="right" align="start" sideOffset={PANEL_GAP_PX} className="sumi-flows-chats">
				<div className="sumi-flows-chats-head">{`${chats.length} chats`}</div>
				{chats.map((chat) => (
					<div className="sumi-flows-chats-item" key={chat.id}>
						<span className="sumi-flows-name">{chat.title ?? UNTITLED_CHAT}</span>
						<StatusMark status={chat.status} />
					</div>
				))}
			</HoverCardContent>
		</HoverCard>
	);
}
