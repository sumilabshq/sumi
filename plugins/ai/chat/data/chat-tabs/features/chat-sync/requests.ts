import { Repeatable } from "@widgetarium/data-framework";
import { workspaces } from "@widgetarium/workspaces/contract";
import { command, subscriber } from "#module";
import { keepChatTabs } from "../../shared/lib/kept-chat-tabs.js";

export const sync = command()
	.public()
	.idempotencyKey(Repeatable)
	.handle(async (_input, { send, ownWindow }) => {
		await keepChatTabs(send, ownWindow.placesWindow());
	});

export const syncOnChatsChanged = subscriber(workspaces.chats.chatsChanged).handle(async (_input, { send, ownWindow }) => {
	await keepChatTabs(send, ownWindow.placesWindow());
});
