import type { Send } from "@widgetarium/data-framework";
import type { PaneBoard } from "@widgetarium/app-host/contract";
import { workspaces } from "@widgetarium/workspaces/contract";
import { isChatHeld } from "./chat-holders.js";

export async function chatIdForPane(send: Send, board: PaneBoard, askedId: string | null): Promise<string> {
	if (askedId !== null && !isChatHeld(board, askedId)) {
		await send(workspaces.chats.forgetToOpen, { id: askedId });
		return askedId;
	}

	const created = await send(workspaces.chats.createChat, { title: null });
	return created.id;
}
