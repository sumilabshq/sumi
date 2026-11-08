import { appHost } from "@widgetarium/app-host/contract";
import { places } from "@widgetarium/places/contract";
import { query, subscriber } from "#module";
import { ChatListSchema } from "../../shared/schema/chat-list.schema.js";
import { chatListOf } from "./lib/chat-list.js";

export const all = query()
	.public()
	.output(ChatListSchema)
	.handle(async (_input, { send }) => chatListOf(await send(places.tabs.chatTabs)));

export const reread = subscriber(appHost.tabs.tabsSettled).handle((_input, { invalidate }) => {
	invalidate(all);
});

export const rereadForCore = subscriber(appHost.coreChanges.studioCoreChanged).handle((_input, { invalidate }) => {
	invalidate(all);
});
