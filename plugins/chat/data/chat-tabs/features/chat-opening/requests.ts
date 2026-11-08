import { PerCall, Repeatable, refuse } from "@widgetarium/data-framework";
import { SyncChatTabsCommand, ShowTabCommand } from "@widgetarium/app-host";
import { PaneTreeQuery } from "@widgetarium/layout";
import { ChatToOpenQuery, CreateChatCommand, ForgetChatToOpenCommand } from "@widgetarium/workspaces";
import { command } from "#module";
import { ChatOpenedSchema, ChatPaneSchema, NewChatTitleSchema } from "../../shared/schema/chat-opening.schema.js";
import { chatIdForPane } from "./lib/chat-for-pane.js";

const NOT_READ = "the layout or the chats are not read yet";
const NOT_AN_EMPTY_CHAT_PANE = "pane {pane} is not a chat pane waiting for a chat";

export const OpenNewChatCommand = command("open-new-chat")
	.public()
	.input(NewChatTitleSchema)
	.output(ChatOpenedSchema)
	.idempotencyKey(PerCall)
	.handle(async ({ title }, { send }) => {
		const created = await send(CreateChatCommand, { title });
		await send(SyncChatTabsCommand);
		await send(ShowTabCommand, { id: created.id });
		return created;
	});

export const NameChatPaneCommand = command("name-chat-pane")
	.public()
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

		const chatId = await chatIdForPane(send, board, asked.id);
		await send(SyncChatTabsCommand);
		await send(ShowTabCommand, { id: chatId, paneId });
		return { id: chatId };
	});

export const OpenChatAskedOnStartCommand = command("open-chat-asked-on-start")
	.public()
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
		await send(SyncChatTabsCommand);
		await send(ShowTabCommand, { id: asked.id });
		await send(ForgetChatToOpenCommand, { id: asked.id });
	});
