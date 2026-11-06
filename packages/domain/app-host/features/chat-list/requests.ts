import { Repeatable, command, query, subscriber } from "@widgetarium/framework";
import { ChatTabsQuery, PinTabCommand as PlacesPinTabCommand } from "@widgetarium/places";
import { StudioWindowGateway } from "../../gateways/studio-window/studio-window.gateway.js";
import { StudioCoreChangedEvent, TabsSettledEvent } from "../../shared/events/tabs.events.js";
import { ChatListSchema, TabPinSchema } from "../../shared/schema/chat-list.schema.js";
import { chatListOf } from "./lib/chat-list.js";

export const ChatListQuery = query("chat-list")
	.output(ChatListSchema)
	.handle(async (_input, { send }) => {
		return chatListOf(await send(ChatTabsQuery));
	});

export const PinTabCommand = command("pin-tab")
	.input(TabPinSchema)
	.idempotencyKey(Repeatable)
	.inject({ studioWindow: StudioWindowGateway })
	.emits(TabsSettledEvent)
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
