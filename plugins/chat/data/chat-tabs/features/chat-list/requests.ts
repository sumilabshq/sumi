import { appHost } from "@widgetarium/app-host/contract";
import { places } from "@widgetarium/places/contract";
import { query, subscriber } from "#module";
import { ChatListSchema } from "../../shared/schema/chat-list.schema.js";
import { chatListOf } from "./lib/chat-list.js";

export const chatList = query()
	.public()
	.output(ChatListSchema)
	.handle(async (_input, { send }) => chatListOf(await send(places.tabs.chatTabs)));

export const rereadChatList = subscriber(appHost.tabs.tabsSettled).handle((_input, { invalidate }) => {
	invalidate(chatList);
});

export const rereadChatListForCore = subscriber(appHost.coreChanges.studioCoreChanged).handle(
	(_input, { invalidate }) => {
		invalidate(chatList);
	},
);
