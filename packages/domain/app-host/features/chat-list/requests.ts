import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { ChatTabsQuery, PinTabCommand as PlacesPinTabCommand } from "@widgetarium/places";
import { StudioCoreChangedEvent } from "../../gateways/core-changes/core-changes.events.js";
import { TabsSettledEvent } from "../../shared/events/tabs.events.js";
import { ChatListSchema, TabPinSchema } from "../../shared/schema/chat-list.schema.js";
import { chatListOf } from "./lib/chat-list.js";

export const ChatListQuery = query("chat-list")
	.public()
	.output(ChatListSchema)
	.handle(async (_input, { send }) => {
		return chatListOf(await send(ChatTabsQuery));
	});

export const PinTabCommand = command("pin-tab")
	.public()
	.input(TabPinSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ id, isPinned }, { send, emit, studioWindow }) => {
		await send(PlacesPinTabCommand, { window: studioWindow.windowLabel(), id, isPinned });
		emit(TabsSettledEvent);
	});

export const RereadChatListSubscriber = subscriber(TabsSettledEvent).handle((_input, { invalidate }) => {
	invalidate(ChatListQuery);
});

export const RereadChatListForCoreSubscriber = subscriber(StudioCoreChangedEvent).handle((_input, { invalidate }) => {
	invalidate(ChatListQuery);
});
