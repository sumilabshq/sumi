import { Repeatable, command, query, subscriber } from "@widgetarium/data-framework";
import { AssistantSetupChangedEvent } from "../../gateways/chat-parts/chat-parts.events.js";
import { chosenOf } from "../../shared/lib/chosen-provider.js";
import { SlashNamesSchema } from "../../shared/schema/slash-command.schema.js";
import type { SlashName } from "../../shared/schema/slash-command.schema.js";
import { ChatKeySchema } from "../../shared/schema/chat-key.schema.js";
import { inChat } from "../../gateways/chat-parts/in-chat.js";
import { ChatPartsGateway } from "../../gateways/chat-parts/chat-parts.gateway.js";

const SLASH_ALWAYS: readonly SlashName[] = ["clear"];
const SLASH_WITH_COMPACT: readonly SlashName[] = ["clear", "compact"];

export const SlashCommandsQuery = query("slash-commands")
	.input(ChatKeySchema)
	.output(SlashNamesSchema)
	.inject({ chatParts: ChatPartsGateway })
	.handle(inChat(async (_input, { assistantSession, assistantSetup }) => {
		if (!assistantSession.isAvailable()) {
			return [];
		}

		const { compacts } = chosenOf(await assistantSetup.setup());
		return [...(compacts ? SLASH_WITH_COMPACT : SLASH_ALWAYS)];
	}));

export const CompactChatCommand = command("compact-chat")
	.input(ChatKeySchema)
	.idempotencyKey(Repeatable)
	.inject({ chatParts: ChatPartsGateway })
	.handle(inChat(async (_input, { assistantSession }) => {
		await assistantSession.compact();
	}));

export const RereadSlashCommandsSubscriber = subscriber(AssistantSetupChangedEvent).handle((_input, { invalidate }) => {
	invalidate(SlashCommandsQuery);
});
