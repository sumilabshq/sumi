import { ChatListQuery, OpenChatCommand, OpenNewChatCommand } from "@widgetarium/app-host";
import { portForChat } from "@widgetarium/core/engine/assistant-port.js";
import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import { failureMessage } from "@widgetarium/core/engine/failure-message.js";
import type { StartedApp } from "@widgetarium/framework";

export interface ChatDelivery {
	readonly chat: string | null;
	readonly message: string;
}

export type ChatDelivered =
	| {
			readonly ok: true;
			readonly chatId: string;
	  }
	| {
			readonly ok: false;
			readonly reason: string;
	  };

export interface ChatDeliveryApps {
	readonly studioApp: StartedApp;
	readonly assistant: AssistantPort;
}

export type SendToChat = (delivery: ChatDelivery) => Promise<ChatDelivered>;

export type ListedChat = (chat: string | null) => Promise<string | null>;

export interface ChatDeliveryPort {
	readonly listedChat: ListedChat;
	readonly sendToChat: SendToChat;
}

const NOT_OPENED = "[tasks] a message for chat {chat} was not delivered: the chat did not open ({reason})";
const NOT_SENT = "[tasks] chat {chat} opened, but the message was not sent ({reason})";
const CHAT_GONE = "chat {chat} is no longer listed";

export function chatDeliveryPortOf(apps: ChatDeliveryApps): ChatDeliveryPort {
	return {
		listedChat: async (chat) => (chat !== null && (await isChatListed(apps.studioApp, chat)) ? chat : null),
		sendToChat: (delivery) => sendToChat(apps, delivery),
	};
}

export async function sendToChat(apps: ChatDeliveryApps, { chat, message }: ChatDelivery): Promise<ChatDelivered> {
	const opened = await openChat(apps.studioApp, chat);

	if (!opened.ok) {
		console.warn(NOT_OPENED.replace("{chat}", chat ?? "new").replace("{reason}", opened.reason));
		return opened;
	}

	return sendToOpened(apps.assistant, { chat, message }, opened.chatId);
}

async function sendToOpened(
	assistant: AssistantPort,
	{ chat, message }: ChatDelivery,
	chatId: string,
): Promise<ChatDelivered> {
	try {
		const port = portForChat(assistant, chatId);
		await (port.sendFromHost === undefined ? port.send(message) : port.sendFromHost(message));
		console.info(
			`[tasks] chat ${chatId}: idle → answering the task's message (${chat === null ? "a new chat took the task" : "its own chat"})`,
		);
		return {
			ok: true,
			chatId,
		};
	} catch (failure) {
		const reason = failureMessage(failure);
		console.warn(NOT_SENT.replace("{chat}", chatId).replace("{reason}", reason));
		return refusedDelivery(reason);
	}
}

async function openChat(studioApp: StartedApp, chat: string | null): Promise<ChatDelivered> {
	if (chat === null) {
		return openNewChat(studioApp);
	}

	if (!(await isChatListed(studioApp, chat))) {
		return refusedDelivery(CHAT_GONE.replace("{chat}", chat));
	}

	const shown = await studioApp.send(OpenChatCommand, {
		chatId: chat,
		paneId: null,
	});
	return shown.ok ? { ok: true, chatId: chat } : shown;
}

function refusedDelivery(reason: string): ChatDelivered {
	return {
		ok: false,
		reason,
	};
}

async function openNewChat(studioApp: StartedApp): Promise<ChatDelivered> {
	const created = await studioApp.send(OpenNewChatCommand, { title: null });
	return created.ok ? { ok: true, chatId: created.output.id } : created;
}

async function isChatListed(studioApp: StartedApp, chat: string): Promise<boolean> {
	const listed = await studioApp.send(ChatListQuery);

	if (!listed.ok) {
		return false;
	}

	return [...listed.output.pinned, ...listed.output.recents].some((row) => row.id === chat);
}
