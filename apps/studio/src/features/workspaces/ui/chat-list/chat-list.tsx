import { createElement as h, useRef, useState } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { ChatListQuery, PlaceChatCommand } from "@widgetarium/app-host";
import { MarkChatSeenCommand } from "@widgetarium/workspaces";
import { TearOffChatCommand } from "@widgetarium/app-host";
import type { ChatRenaming } from "../../lib/chat-renaming.js";
import { useRenamingIdIn } from "../../lib/chat-renaming.js";
import { useChatListDrag } from "../../lib/chat-drag/use-chat-list-drag.js";
import { ChatMenu } from "../chat-menu/chat-menu.js";
import type { ChatMenuAt } from "../chat-menu/chat-menu.js";
import { ChatSection } from "./chat-section.js";
import { useTearOffOverlay } from "../../../browser/lib/use-tear-off-overlay.js";

const PINNED = "Pinned";
const RECENTS = "Recents";

export function ChatList({ renaming }: { readonly renaming: ChatRenaming }): ReactElement {
	const { pinned, recents } = useQuery(ChatListQuery).data;
	const placeChat = useCommand(PlaceChatCommand);
	const markChatSeen = useCommand(MarkChatSeenCommand);
	const tearOffChat = useCommand(TearOffChatCommand);
	const holder = useRef<HTMLDivElement | null>(null);
	const tearOffOverlay = useTearOffOverlay();
	const [isDragging, setIsDragging] = useState(false);
	const [menuAt, setMenuAt] = useState<ChatMenuAt | null>(null);
	const renamingId = useRenamingIdIn(renaming, "row");
	useChatListDrag(holder, {
		onLift: () => setIsDragging(true),
		onEnd: () => setIsDragging(false),
		onPlace: (id, to) => void placeChat.run({ id, to }),
		onTakenByBoard: (id) => void markChatSeen.run({ id }),
		onTearOff: (id) => void tearOffChat.run({ chatId: id }),
		overlay: tearOffOverlay,
	});
	const menuRow = [...pinned, ...recents].find((row) => row.id === menuAt?.id) ?? null;
	const rowHandlers = { renamingId, onMenu: setMenuAt, onRenamed: renaming.stop };
	return (
		<div ref={holder} className="wg-ws-chats" data-ws-chats="" data-ws-dragging={isDragging || undefined}>
			{(pinned.length > 0 || isDragging) && <ChatSection list="pinned" label={PINNED} rows={pinned} {...rowHandlers} />}
			<ChatSection list="recents" label={RECENTS} rows={recents} {...rowHandlers} />
			<ChatMenu
				at={menuAt}
				row={menuRow}
				onClose={() => setMenuAt(null)}
				onRename={(id) => renaming.start(id, "row")}
			/>
		</div>
	);
}
