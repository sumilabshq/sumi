import { createElement as h, useCallback, useState } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { ChatListQuery } from "@widgetarium/workspaces";
import { ChatMenu } from "../chat-menu/chat-menu.js";
import type { ChatMenuAt } from "../chat-menu/chat-menu.js";
import { ChatSection } from "./chat-section.js";

const PINNED = "Pinned";
const RECENTS = "Recents";

export function ChatList(): ReactElement {
	const { pinned, recents } = useQuery(ChatListQuery).data;
	const [menuAt, setMenuAt] = useState<ChatMenuAt | null>(null);
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const openMenu = useCallback((at: ChatMenuAt) => setMenuAt(at), []);
	const stopRenaming = useCallback(() => setRenamingId(null), []);
	const menuRow = [...pinned, ...recents].find((row) => row.id === menuAt?.id) ?? null;
	const shared = { renamingId, onMenu: openMenu, onRenamed: stopRenaming };
	return (
		<div className="wg-ws-chats" data-ws-chats="">
			{pinned.length === 0 ? null : <ChatSection label={PINNED} rows={pinned} {...shared} />}
			<ChatSection label={RECENTS} rows={recents} {...shared} />
			<ChatMenu at={menuAt} row={menuRow} onClose={() => setMenuAt(null)} onRename={(id) => setRenamingId(id)} />
		</div>
	);
}
