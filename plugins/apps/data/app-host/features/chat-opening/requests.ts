import { Repeatable } from "@widgetarium/data-framework";
import { command } from "#module";
import { TabsSettledEvent } from "../../shared/events/tabs.events.js";
import { showChatSettled } from "../../shared/lib/tab-showing/tab-opening.js";
import { ChatToShowSchema } from "../../shared/schema/chat-opening.schema.js";

export const OpenChatCommand = command("open-chat")
	.public()
	.input(ChatToShowSchema)
	.idempotencyKey(Repeatable)
	.handle(async (chat, { send, emit, ...injects }) => {
		await showChatSettled({ injects, send, told: () => emit(TabsSettledEvent) }, chat);
	});
