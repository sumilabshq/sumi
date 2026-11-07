import type { Send } from "@widgetarium/data-framework";
import type { PaneBoard } from "@widgetarium/layout";
import { CreateChatCommand, ForgetChatToOpenCommand } from "@widgetarium/workspaces";
import { isChatHeld } from "./chat-holders.js";

export async function chatIdForPane(send: Send, board: PaneBoard, askedId: string | null): Promise<string> {
	if (askedId !== null && !isChatHeld(board, askedId)) {
		await send(ForgetChatToOpenCommand, { id: askedId });
		return askedId;
	}

	const created = await send(CreateChatCommand, { title: null });
	return created.id;
}
