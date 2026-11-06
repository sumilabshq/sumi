import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/data-framework";
import { NEW_CHAT_TITLE } from "@widgetarium/core/engine/focused-chat-port.js";
import { WorkspaceCrumbQuery } from "@widgetarium/workspaces";
import type { ChatRenaming } from "../../lib/chat-renaming.js";
import { useRenamingIdIn } from "../../lib/chat-renaming.js";
import { useChatRow } from "../../lib/use-chat-row.js";
import { ChatLinkCrumb } from "./chat-link-crumb.js";
import { RenamingCrumb } from "./renaming-crumb.js";

export interface ChatCrumbProps {
	readonly renaming: ChatRenaming;
	readonly chatId: string | null;
}

export function ChatCrumb({ renaming, chatId }: ChatCrumbProps): ReactElement {
	const { workspace } = useQuery(WorkspaceCrumbQuery).data;
	const row = useChatRow(chatId);
	const renamingId = useRenamingIdIn(renaming, "crumb");

	if (row !== null && row.id === renamingId) {
		return <RenamingCrumb workspace={workspace} chat={row} renaming={renaming} />;
	}

	return <ChatLinkCrumb chatId={chatId} words={{ first: workspace, second: row?.title ?? NEW_CHAT_TITLE }} />;
}
