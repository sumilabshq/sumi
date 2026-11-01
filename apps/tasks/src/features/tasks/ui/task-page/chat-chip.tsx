import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Badge, tooltipMarks } from "@widgetarium/kit";
import { useChatRow } from "../../lib/chat-rows.js";
import { chatLinkOf } from "./chat-link.js";
import type { ChatLinkProps } from "./chat-link.js";
import { ClosedChat } from "./closed-chat.js";
import { UnlistedChip } from "./unlisted-chip.js";

export function ChatChip({ chatId, unlisted = <ClosedChat chatId={chatId} /> }: ChatLinkProps): ReactElement {
	const row = useChatRow(chatId);

	if (row === null) {
		return <UnlistedChip unlisted={unlisted} />;
	}

	return (
		<Badge asChild variant="chip">
			<a href={chatLinkOf(chatId)} data-tasks-chat-link={chatId} {...tooltipMarks({ said: chatId })}>
				{row.title}
			</a>
		</Badge>
	);
}
