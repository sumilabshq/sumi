import { FocusStudioWindowCommand } from "@widgetarium/browser";
import { PaneTreeQuery, ShowChatInPaneCommand } from "@widgetarium/layout";
import {
	MarkTabSeenCommand,
	OpenTabCommand as PlacesOpenTabCommand,
	ShowTabCommand as PlacesShowTabCommand,
} from "@widgetarium/places";
import type { Send } from "@widgetarium/framework";
import { windowHoldingChat } from "../chat-holders.js";
import type { TabToOpen } from "../../schema/app-tab.schema.js";
import type { ChatToShow } from "../../schema/chat-opening.schema.js";
import { sendLogged, settleAsked } from "./tab-settling.js";
import type { TabsReach } from "./tab-settling.js";

export interface OpenedTab {
	readonly id: string;
}

export async function openTabSettled(reach: TabsReach, asked: TabToOpen): Promise<OpenedTab> {
	const opened = await settleAsked(reach, (at) => reach.send(PlacesOpenTabCommand, { at, ...asked }));
	return { id: opened.id };
}

export async function showTabSettled(reach: TabsReach, id: string): Promise<void> {
	await settleAsked(reach, (at) => reach.send(PlacesShowTabCommand, { at, id }));
}

export async function showChatSettled(reach: TabsReach, chat: ChatToShow): Promise<void> {
	await sendLogged(`show chat ${chat.chatId} in the view`, () => showTabSettled(reach, chat.chatId));
	await showChatInPane(reach.send, chat);
}

async function showChatInPane(send: Send, { chatId, paneId }: ChatToShow): Promise<void> {
	const board = await send(PaneTreeQuery);
	const holder = windowHoldingChat(board, chatId);

	if (holder !== null) {
		console.info(`[widgetarium] open chat ${chatId} → window ${holder} comes forward (it holds the chat)`);
		await send(FocusStudioWindowCommand, { window: holder });
		return;
	}

	await send(MarkTabSeenCommand, { id: chatId });
	await send(ShowChatInPaneCommand, { chatId, paneId });
}
