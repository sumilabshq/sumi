import { appHost } from "@widgetarium/app-host/contract";
import { chatFacts } from "@sumi/chat-facts/contract";
import { query, subscriber } from "#module";
import { ChatListSchema } from "../../shared/schema/chat-list.schema.js";
import { chatListOf } from "./lib/chat-list.js";

export const all = query()
	.public()
	.output(ChatListSchema)
	.handle(async (_input, { send }) => chatListOf(await send(chatFacts.openChats.all)));

export const reread = subscriber(appHost.tabs.tabsSettled).handle((_input, { invalidate }) => {
	invalidate(all);
});

export const rereadForCore = subscriber(appHost.coreChanges.studioCoreChanged).handle((_input, { invalidate }) => {
	invalidate(all);
});
