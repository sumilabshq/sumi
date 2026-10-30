import { z } from "zod";
import { PerCall, Repeatable, command, refuse } from "@widgetarium/core/requests";
import type { Send } from "@widgetarium/core/requests";
import { FocusStudioWindowCommand, OpenChatWindowCommand } from "@widgetarium/browser";
import { ClosePaneCommand, PaneTreeQuery, ShowChatInPaneCommand } from "@widgetarium/layout";
import {
	ChatToOpenQuery,
	CreateChatCommand,
	ForgetChatToOpenCommand,
	MarkChatSeenCommand,
} from "@widgetarium/workspaces";
import { KeepChatTabsCommand, ShowTabCommand as PlacesShowTabCommand } from "@widgetarium/places";
import { TabsSettledEvent } from "../../shared/events/tabs.events.js";
import { SHOWING_PARTS } from "../../shared/lib/tab-showing/showing-parts.js";
import { sendLogged, settleAsked } from "../../shared/lib/tab-showing/tab-settling.js";
import { isChatHeld, windowHoldingChat } from "../../shared/lib/chat-holders.js";
import {
	ChatOpenedSchema,
	ChatPaneSchema,
	ChatToShowSchema,
	NewChatTitleSchema,
} from "../../shared/schema/chat-opening.schema.js";
import type { ChatToShow } from "../../shared/schema/chat-opening.schema.js";

const NOT_READ = "the layout or the chats are not read yet";
const NOT_AN_EMPTY_CHAT_PANE = "pane {pane} is not a chat pane waiting for a chat";

export const OpenChatCommand = command("open-chat")
	.input(ChatToShowSchema)
	.idempotencyKey(Repeatable)
	.inject(SHOWING_PARTS)
	.emits(TabsSettledEvent)
	.handle(async ({ chatId, paneId }, { send, emit, ...parts }) => {
		await sendLogged(`show chat ${chatId} in the view`, () =>
			settleAsked({ parts, send, told: () => emit(TabsSettledEvent) }, (at) =>
				send(PlacesShowTabCommand, { at, id: chatId }),
			),
		);
		await openChat(send, { chatId, paneId });
	});

export const OpenNewChatCommand = command("open-new-chat")
	.input(NewChatTitleSchema)
	.output(ChatOpenedSchema)
	.idempotencyKey(PerCall)
	.handle(async ({ title }, { send }) => {
		const created = await createChat(send, title);
		await openChat(send, { chatId: created.id, paneId: null });
		return created;
	});

export const NameChatPaneCommand = command("name-chat-pane")
	.input(ChatPaneSchema)
	.output(ChatOpenedSchema)
	.idempotencyKey((input) => input.paneId)
	.handle(async ({ paneId }, { send }) => {
		const [board, asked] = await Promise.all([send(PaneTreeQuery), send(ChatToOpenQuery)]);

		if (!board.isLoaded || !asked.isRead) {
			return refuse(NOT_READ);
		}

		const pane = board.leaves.find((leaf) => leaf.id === paneId);

		if (pane?.view.kind !== "chat" || pane.view.chatId !== undefined) {
			return refuse(NOT_AN_EMPTY_CHAT_PANE.replace("{pane}", paneId));
		}

		const askedFree = asked.id !== null && !isChatHeld(board, asked.id) ? asked.id : null;

		if (askedFree !== null) {
			await openChat(send, { chatId: askedFree, paneId });
			await send(ForgetChatToOpenCommand, { id: askedFree });
			return { id: askedFree };
		}

		const created = await createChat(send, null);
		await openChat(send, { chatId: created.id, paneId });
		return created;
	});

export const OpenChatAskedOnStartCommand = command("open-chat-asked-on-start")
	.idempotencyKey(Repeatable)
	.handle(async (_input, { send }) => {
		const [board, asked] = await Promise.all([send(PaneTreeQuery), send(ChatToOpenQuery)]);

		if (!board.isLoaded || !asked.isRead) {
			return refuse(NOT_READ);
		}

		if (asked.id === null) {
			return;
		}

		console.info(`[widgetarium] chat ${asked.id} opens on start (asked from another workspace)`);
		await openChat(send, { chatId: asked.id, paneId: null });
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

async function createChat(send: Send, title: string | null): Promise<{ readonly id: string }> {
	const created = await send(CreateChatCommand, { title });
	await send(KeepChatTabsCommand, { chatIds: [created.id] });
	return created;
}

async function openChat(send: Send, { chatId, paneId }: ChatToShow): Promise<void> {
	const board = await send(PaneTreeQuery);
	const holder = windowHoldingChat(board, chatId);

	if (holder !== null) {
		console.info(`[widgetarium] open chat ${chatId} → window ${holder} comes forward (it holds the chat)`);
		await send(FocusStudioWindowCommand, { window: holder });
		return;
	}

	await send(MarkChatSeenCommand, { id: chatId });
	await send(ShowChatInPaneCommand, { chatId, paneId });
}
