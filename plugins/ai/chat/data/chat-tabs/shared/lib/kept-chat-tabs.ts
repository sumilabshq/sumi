import type { Send } from "@widgetarium/data-framework";
import { chatFacts } from "@sumi/chat-facts/contract";
import { workspaces } from "@widgetarium/workspaces/contract";

export async function keepChatTabs(send: Send, window: string): Promise<void> {
	const records = await send(workspaces.chats.chatRecords);

	if (!records.isRead) {
		console.info("[widgetarium] keep chat tabs skipped: the chats are not read yet");
		return;
	}

	const live = records.chats.filter(({ isArchived }) => !isArchived);
	await send(chatFacts.turns.keepChatTabs, { window, chats: live.map(({ id, title }) => ({ id, title })) });
}
