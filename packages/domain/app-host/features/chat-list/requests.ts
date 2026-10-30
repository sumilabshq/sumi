import { Repeatable, command, query, subscriber } from "@widgetarium/core/requests";
import { ChatTabsQuery, PinTabCommand, PlaceTabCommand } from "@widgetarium/places";
import { ChatMarksChangedEvent, ChatRecordsQuery, ChatsChangedEvent } from "@widgetarium/workspaces";
import { PaneFlashGateway } from "../../gateways/pane-flash/pane-flash.gateway.js";
import { ShownViewGateway } from "../../gateways/shown-view/shown-view.gateway.js";
import { StudioWindowGateway } from "../../gateways/studio-window/studio-window.gateway.js";
import { StudioCoreChangedEvent, TabsSettledEvent } from "../../shared/events/tabs.events.js";
import { settleAsked } from "../../shared/lib/tab-showing/tab-settling.js";
import { ChatListSchema, ChatPinSchema, ChatPlaceSchema } from "../../shared/schema/chat-list.schema.js";
import { chatListOf } from "./lib/chat-list.js";

export const ChatListQuery = query("chat-list")
	.output(ChatListSchema)
	.handle(async (_input, { send }) => {
		const [tabs, records] = await Promise.all([send(ChatTabsQuery), send(ChatRecordsQuery)]);
		return chatListOf(tabs, records);
	});

export const PinChatCommand = command("pin-chat")
	.input(ChatPinSchema)
	.idempotencyKey(Repeatable)
	.inject({ studioWindow: StudioWindowGateway })
	.emits(TabsSettledEvent)
	.handle(async ({ id, isPinned }, { send, emit, studioWindow }) => {
		await send(PinTabCommand, { window: studioWindow.windowLabel(), id, isPinned });
		emit(TabsSettledEvent);
	});

export const PlaceChatCommand = command("place-chat")
	.input(ChatPlaceSchema)
	.idempotencyKey(Repeatable)
	.inject({
		studioWindow: StudioWindowGateway,
		shownView: ShownViewGateway,
		paneFlash: PaneFlashGateway,
	})
	.emits(TabsSettledEvent)
	.handle(async ({ id, to }, { send, emit, ...parts }) => {
		if (to.list === "recents") {
			await send(PinTabCommand, { window: parts.studioWindow.windowLabel(), id, isPinned: false });
			emit(TabsSettledEvent);
			return;
		}

		const place = { list: "pinned", groupId: null, before: to.before };
		await settleAsked({ parts, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlaceTabCommand, { at, id, place }),
		);
	});

export const RereadChatListSubscriber = subscriber(TabsSettledEvent).handle((_input, { invalidate }) => {
	invalidate(ChatListQuery);
});

export const RereadChatListForChatsSubscriber = subscriber(ChatsChangedEvent).handle((_input, { invalidate }) => {
	invalidate(ChatListQuery);
});

export const RereadChatListForMarksSubscriber = subscriber(ChatMarksChangedEvent).handle((_input, { invalidate }) => {
	invalidate(ChatListQuery);
});

export const RereadChatListForCoreSubscriber = subscriber(StudioCoreChangedEvent).handle((_input, { invalidate }) => {
	invalidate(ChatListQuery);
});
