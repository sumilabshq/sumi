import { z } from "zod";
import { PerCall, Repeatable, command, refuse } from "@widgetarium/core/requests";
import type { Send } from "@widgetarium/core/requests";
import { FocusStudioWindowCommand, OpenChatWindowCommand } from "@widgetarium/browser";
import { ClosePaneCommand, PaneTreeQuery } from "@widgetarium/layout";
import type { PaneBoard } from "@widgetarium/layout";
import { ChatToOpenQuery, CreateChatCommand, ForgetChatToOpenCommand } from "@widgetarium/workspaces";
import { TabsSettledEvent } from "../../shared/events/tabs.events.js";
import { SHOWING_PARTS } from "../../shared/lib/tab-showing/showing-parts.js";
import { showChatSettled } from "../../shared/lib/tab-showing/tab-opening.js";
import { isChatHeld, windowHoldingChat } from "../../shared/lib/chat-holders.js";
import {
	ChatOpenedSchema,
	ChatPaneSchema,
	ChatToShowSchema,
	NewChatTitleSchema,
} from "../../shared/schema/chat-opening.schema.js";

const NOT_READ = "the layout or the chats are not read yet";
const NOT_AN_EMPTY_CHAT_PANE = "pane {pane} is not a chat pane waiting for a chat";

export const OpenChatCommand = command("open-chat")
	.input(ChatToShowSchema)
	.idempotencyKey(Repeatable)
	.inject(SHOWING_PARTS)
	.emits(TabsSettledEvent)
	.handle(async (chat, { send, emit, ...parts }) => {
		await showChatSettled({ parts, send, told: () => emit(TabsSettledEvent) }, chat);
	});

export const OpenNewChatCommand = command("open-new-chat")
	.input(NewChatTitleSchema)
	.output(ChatOpenedSchema)
	.idempotencyKey(PerCall)
	.inject(SHOWING_PARTS)
	.emits(TabsSettledEvent)
	.handle(async ({ title }, { send, emit, ...parts }) => {
		const created = await createChat(send, title);
		await showChatSettled({ parts, send, told: () => emit(TabsSettledEvent) }, { chatId: created.id, paneId: null });
		return created;
	});

export const NameChatPaneCommand = command("name-chat-pane")
	.input(ChatPaneSchema)
	.output(ChatOpenedSchema)
	.idempotencyKey((input) => input.paneId)
	.inject(SHOWING_PARTS)
	.emits(TabsSettledEvent)
	.handle(async ({ paneId }, { send, emit, ...parts }) => {
		const [board, asked] = await Promise.all([send(PaneTreeQuery), send(ChatToOpenQuery)]);

		if (!board.isLoaded || !asked.isRead) {
			return refuse(NOT_READ);
		}

		const pane = board.leaves.find((leaf) => leaf.id === paneId);

		if (pane?.view.kind !== "chat" || pane.view.chatId !== undefined) {
			return refuse(NOT_AN_EMPTY_CHAT_PANE.replace("{pane}", paneId));
		}

		const chatId = await chatIdForPane(send, board, asked.id);
		await showChatSettled({ parts, send, told: () => emit(TabsSettledEvent) }, { chatId, paneId });
		return { id: chatId };
	});

export const OpenChatAskedOnStartCommand = command("open-chat-asked-on-start")
	.idempotencyKey(Repeatable)
	.inject(SHOWING_PARTS)
	.emits(TabsSettledEvent)
	.handle(async (_input, { send, emit, ...parts }) => {
		const [board, asked] = await Promise.all([send(PaneTreeQuery), send(ChatToOpenQuery)]);

		if (!board.isLoaded || !asked.isRead) {
			return refuse(NOT_READ);
		}

		if (asked.id === null) {
			return;
		}

		console.info(`[widgetarium] chat ${asked.id} opens on start (asked from another workspace)`);
		await showChatSettled({ parts, send, told: () => emit(TabsSettledEvent) }, { chatId: asked.id, paneId: null });
		await send(ForgetChatToOpenCommand, { id: asked.id });
	});

export const TearOffChatCommand = command("tear-off-chat")
	.input(z.object({ chatId: z.string().min(1) }))
	.idempotencyKey(Repeatable)
	.handle(async ({ chatId }, { send }) => {
		const board = await send(PaneTreeQuery);
		const holder = windowHoldingChat(board, chatId);

		if (holder !== null) {
			console.info(`[widgetarium] tear off chat ${chatId} → window ${holder} comes forward (it holds the chat)`);
			await send(FocusStudioWindowCommand, { window: holder });
			return;
		}

		const standing = board.leaves.find((leaf) => leaf.view.kind === "chat" && leaf.view.chatId === chatId);

		if (standing !== undefined) {
			await send(ClosePaneCommand, { id: standing.id });
		}

		await send(OpenChatWindowCommand, { chatId });
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
