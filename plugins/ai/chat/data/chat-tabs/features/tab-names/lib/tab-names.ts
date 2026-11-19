import type { Send } from "@widgetarium/data-framework";
import { chatFacts } from "@sumi/chat-facts/contract";
import type { ChatTabLabel } from "@sumi/chat-facts/contract";
import { workspaces } from "@widgetarium/workspaces/contract";

export async function nameChatsAfterTabLabels(send: Send): Promise<void> {
	const { labels } = await send(chatFacts.tabLabels.all);

	if (labels.length === 0) {
		return;
	}

	const records = await send(workspaces.chats.chatRecords);

	if (!records.isRead) {
		console.info("[widgetarium] chat tab labels kept for now: the chats are not read yet");
		return;
	}

	const known = new Set(records.chats.map(({ id }) => id));

	for (const adopted of labels) {
		if (!known.has(adopted.chatId)) {
			console.info(`[widgetarium] tab label "${adopted.label}" kept: no chat ${adopted.chatId} to name`);
			continue;
		}

		await nameChatAfterLabel(send, adopted);
	}
}

async function nameChatAfterLabel(send: Send, { chatId, label }: ChatTabLabel): Promise<void> {
	try {
		await send(workspaces.chats.renameChat, {
			id: chatId,
			title: label,
			by: "person",
		});
	} catch (failure: unknown) {
		console.error(`[widgetarium] chat ${chatId} not named "${label}" after its tab; the tab keeps the label`, failure);
		return;
	}

	const records = await send(workspaces.chats.chatRecords);
	const title = records.chats.find(({ id }) => id === chatId)?.title ?? null;

	if (title === null) {
		console.info(`[widgetarium] tab label "${label}" kept: chat ${chatId} has no title to show instead`);
		return;
	}

	await send(chatFacts.tabLabels.drop, {
		chatId,
		label,
		title,
	});
}
