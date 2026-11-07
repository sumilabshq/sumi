import { StudioCoreChangedEvent, TabsSettledEvent } from "@widgetarium/app-host";
import { ChatTabsQuery } from "@widgetarium/places";
import { query, subscriber } from "#module";
import { ChatListSchema } from "../../shared/schema/chat-list.schema.js";
import { chatListOf } from "./lib/chat-list.js";

export const ChatListQuery = query("chat-list")
	.public()
	.output(ChatListSchema)
	.handle(async (_input, { send }) => chatListOf(await send(ChatTabsQuery)));

export const RereadChatListSubscriber = subscriber(TabsSettledEvent).handle((_input, { invalidate }) => {
	invalidate(ChatListQuery);
});

export const RereadChatListForCoreSubscriber = subscriber(StudioCoreChangedEvent).handle((_input, { invalidate }) => {
	invalidate(ChatListQuery);
});
