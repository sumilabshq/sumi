import { createElement as h } from "react";
import type { ReactNode } from "react";
import { TextLink, tooltipMarks } from "@widgetarium/kit";
import { linkOf } from "@widgetarium/core/engine/sumi-link.js";
import { useChatRow } from "../../lib/chat-rows.js";
import { ClosedChat } from "./closed-chat.js";

export interface ChatLinkProps {
	readonly chatId: string;
	readonly unlisted?: ReactNode;
}

export function ChatLink({ chatId, unlisted = <ClosedChat chatId={chatId} /> }: ChatLinkProps): ReactNode {
	const row = useChatRow(chatId);

	if (row === null) {
		return unlisted;
	}

	return (
		<TextLink href={chatLinkOf(chatId)} data-tasks-chat-link={chatId} {...tooltipMarks({ said: chatId })}>
			{row.title}
		</TextLink>
	);
}

export function chatLinkOf(chatId: string): string {
	return linkOf({
		kind: "chat",
		id: chatId,
	});
}
