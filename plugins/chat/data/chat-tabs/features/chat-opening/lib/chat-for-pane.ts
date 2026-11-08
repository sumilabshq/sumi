import type { Send } from "@widgetarium/data-framework";
import type { PaneBoard } from "@widgetarium/layout";
import { workspaces } from "@widgetarium/workspaces";
import { isChatHeld } from "./chat-holders.js";

export async function chatIdForPane(send: Send, board: PaneBoard, askedId: string | null): Promise<string> {
	if (askedId !== null && !isChatHeld(board, askedId)) {
		await send(workspaces.chats.forgetChatToOpen, { id: askedId });
		return askedId;
	}

	const created = await send(workspaces.chats.createChat, { title: null });
	return created.id;
}
