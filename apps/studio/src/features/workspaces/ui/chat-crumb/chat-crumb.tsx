import { createElement as h } from "react";
import type { ReactElement } from "react";
import { NEW_CHAT_TITLE } from "@widgetarium/core/engine/focused-chat-port.js";
import type { ChatRenaming } from "../../lib/chat-renaming.js";
import { useRenamingIdIn } from "../../lib/chat-renaming.js";
import { useChatRow } from "../../lib/use-chat-row.js";
import { ChatTitleCrumb } from "./chat-title-crumb.js";
import { RenamingCrumb } from "./renaming-crumb.js";

export interface ChatCrumbProps {
	readonly renaming: ChatRenaming;
	readonly chatId: string | null;
}

export function ChatCrumb({ renaming, chatId }: ChatCrumbProps): ReactElement {
	const row = useChatRow(chatId);
	const renamingId = useRenamingIdIn(renaming, "crumb");

	if (row !== null && row.id === renamingId) {
		return <RenamingCrumb chat={row} renaming={renaming} />;
	}

	return <ChatTitleCrumb words={{ first: row?.title ?? NEW_CHAT_TITLE, second: null }} />;
}
