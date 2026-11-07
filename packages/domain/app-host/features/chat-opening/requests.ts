import { PerCall, Repeatable, refuse } from "@widgetarium/data-framework";
import { command } from "#module";
import type { Send } from "@widgetarium/data-framework";
import { PaneTreeQuery } from "@widgetarium/layout";
import type { PaneBoard } from "@widgetarium/layout";
import { ChatToOpenQuery, CreateChatCommand, ForgetChatToOpenCommand } from "@widgetarium/workspaces";
import { TabsSettledEvent } from "../../shared/events/tabs.events.js";
import { showChatSettled } from "../../shared/lib/tab-showing/tab-opening.js";
import { isChatHeld } from "../../shared/lib/chat-holders.js";
import { ChatOpenedSchema, ChatPaneSchema, ChatToShowSchema, NewChatTitleSchema } from "../../shared/schema/chat-opening.schema.js";

const NOT_READ = "the layout or the chats are not read yet";
const NOT_AN_EMPTY_CHAT_PANE = "pane {pane} is not a chat pane waiting for a chat";

export const OpenChatCommand = command("open-chat")
	.public()
	.input(ChatToShowSchema)
	.idempotencyKey(Repeatable)
	.handle(async (chat, { send, emit, ...injects }) => {
		await showChatSettled({ injects, send, told: () => emit(TabsSettledEvent) }, chat);
	});

export const OpenNewChatCommand = command("open-new-chat")
	.public()
	.input(NewChatTitleSchema)
	.output(ChatOpenedSchema)
	.idempotencyKey(PerCall)
	.handle(async ({ title }, { send, emit, ...injects }) => {
		const created = await createChat(send, title);
		await showChatSettled({ injects, send, told: () => emit(TabsSettledEvent) }, { chatId: created.id, paneId: null });
		return created;
	});

export const NameChatPaneCommand = command("name-chat-pane")
	.public()
	.input(ChatPaneSchema)
	.output(ChatOpenedSchema)
	.idempotencyKey((input) => input.paneId)
	.handle(async ({ paneId }, { send, emit, ...injects }) => {
		const [board, asked] = await Promise.all([send(PaneTreeQuery), send(ChatToOpenQuery)]);

		if (!board.isLoaded || !asked.isRead) {
			return refuse(NOT_READ);
		}

		const pane = board.leaves.find((leaf) => leaf.id === paneId);

		if (pane?.view.kind !== "chat" || pane.view.chatId !== undefined) {
			return refuse(NOT_AN_EMPTY_CHAT_PANE.replace("{pane}", paneId));
		}

		const chatId = await chatIdForPane(send, board, asked.id);
		await showChatSettled({ injects, send, told: () => emit(TabsSettledEvent) }, { chatId, paneId });
		return { id: chatId };
	});

export const OpenChatAskedOnStartCommand = command("open-chat-asked-on-start")
	.public()
	.idempotencyKey(Repeatable)
	.handle(async (_input, { send, emit, ...injects }) => {
		const [board, asked] = await Promise.all([send(PaneTreeQuery), send(ChatToOpenQuery)]);

		if (!board.isLoaded || !asked.isRead) {
			return refuse(NOT_READ);
		}

		if (asked.id === null) {
			return;
		}

		console.info(`[widgetarium] chat ${asked.id} opens on start (asked from another workspace)`);
		await showChatSettled({ injects, send, told: () => emit(TabsSettledEvent) }, { chatId: asked.id, paneId: null });
		await send(ForgetChatToOpenCommand, { id: asked.id });
	});

async function chatIdForPane(send: Send, board: PaneBoard, askedId: string | null): Promise<string> {
	if (askedId !== null && !isChatHeld(board, askedId)) {
		await send(ForgetChatToOpenCommand, { id: askedId });
		return askedId;
	}

	const created = await createChat(send, null);
	return created.id;
}

function createChat(send: Send, title: string | null): Promise<{ readonly id: string }> {
	return send(CreateChatCommand, { title });
}
