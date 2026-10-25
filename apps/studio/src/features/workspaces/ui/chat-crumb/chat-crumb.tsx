import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { NEW_CHAT_TITLE } from "@widgetarium/core/engine/focused-chat-port.js";
import { WorkspaceCrumbQuery } from "@widgetarium/workspaces";
import type { ChatRenaming } from "../../lib/chat-renaming.js";
import { useRenamingIdIn } from "../../lib/chat-renaming.js";
import { useChatRow } from "../../lib/use-chat-row.js";
import { ChatTitleField } from "../chat-list/chat-title-field.js";

export interface ChatCrumbProps {
	readonly renaming: ChatRenaming;
	readonly chatId: string | null;
}

export function ChatCrumb({ renaming, chatId }: ChatCrumbProps): ReactElement {
	const { workspace } = useQuery(WorkspaceCrumbQuery).data;
	const row = useChatRow(chatId);
	const renamingId = useRenamingIdIn(renaming, "crumb");
	return (
		<span className="wg-ws-crumb" data-ws-crumb="">
			<span className="wg-ws-crumb-workspace">{workspace}</span>
			<span className="wg-ws-crumb-slash" aria-hidden="true">
				/
			</span>
			{row !== null && row.id === renamingId ? (
				<ChatTitleField row={row} onRenamed={() => renaming.stop()} />
			) : (
				<span className="wg-ws-crumb-chat">{row?.title ?? NEW_CHAT_TITLE}</span>
			)}
		</span>
	);
}
