import { PerCall, Repeatable, refuse } from "@widgetarium/data-framework";
import type { Send } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { workspaces } from "@widgetarium/workspaces/contract";
import { command } from "#module";
import { ChatOpenedSchema, ChatPaneSchema, NewChatTitleSchema } from "../../shared/schema/chat-opening.schema.js";
import { chatIdForPane } from "./lib/chat-for-pane.js";
import { keepChatTabs } from "../../shared/lib/kept-chat-tabs.js";

const NOT_READ = "the layout or the chats are not read yet";
const NOT_AN_EMPTY_CHAT_PANE = "pane {pane} is not a chat pane waiting for a chat";

export const create = command()
	.public()
	.input(NewChatTitleSchema)
	.output(ChatOpenedSchema)
	.idempotencyKey(PerCall)
	.handle(({ title }, { send, ownWindow }) => createdChatOf(send, ownWindow.placesWindow(), title));

export const openNew = command()
	.public()
	.input(NewChatTitleSchema)
	.output(ChatOpenedSchema)
	.idempotencyKey(PerCall)
	.handle(async ({ title }, { send, ownWindow }) => {
		const created = await createdChatOf(send, ownWindow.placesWindow(), title);
		await send(appHost.tabs.showTab, { id: created.id });
		return created;
	});

export const namePane = command()
	.public()
	.input(ChatPaneSchema)
	.output(ChatOpenedSchema)
	.idempotencyKey((input) => input.paneId)
	.handle(async ({ paneId }, { send, ownWindow }) => {
		const [board, asked] = await Promise.all([send(appHost.panes.paneTree), send(workspaces.chats.chatToOpen)]);

		if (!board.isLoaded || !asked.isRead) {
			return refuse(NOT_READ);
		}

		const pane = board.leaves.find((leaf) => leaf.id === paneId);

		if (pane?.view.kind !== "chat" || pane.view.chatId !== undefined) {
			return refuse(NOT_AN_EMPTY_CHAT_PANE.replace("{pane}", paneId));
		}

		const chatId = await chatIdForPane(send, board, asked.id);
		await keepChatTabs(send, ownWindow.placesWindow());
		await send(appHost.tabs.showTab, { id: chatId, paneId });
		return { id: chatId };
	});

export const openAskedOnStart = command()
	.public()
	.idempotencyKey(Repeatable)
	.handle(async (_input, { send, ownWindow }) => {
		const [board, asked] = await Promise.all([send(appHost.panes.paneTree), send(workspaces.chats.chatToOpen)]);

		if (!board.isLoaded || !asked.isRead) {
			return refuse(NOT_READ);
		}

		if (asked.id === null) {
			return;
		}

		console.info(`[widgetarium] chat ${asked.id} opens on start (asked from another workspace)`);
		await keepChatTabs(send, ownWindow.placesWindow());
		await send(appHost.tabs.showTab, { id: asked.id });
		await send(workspaces.chats.forgetToOpen, { id: asked.id });
	});

async function createdChatOf(send: Send, window: string, title: string | null): Promise<{ readonly id: string }> {
	const created = await send(workspaces.chats.createChat, { title });
	await keepChatTabs(send, window);
	return created;
}
