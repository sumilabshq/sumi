import { Repeatable, command, query, subscriber } from "@widgetarium/data-framework";
import { AssistantSessionGateway } from "../../gateways/assistant-session/assistant-session.gateway.js";
import { AssistantSetupChangedEvent } from "../../gateways/assistant-setup/assistant-setup.events.js";
import { AssistantSetupGateway } from "../../gateways/assistant-setup/assistant-setup.gateway.js";
import { chosenOf } from "../../shared/lib/chosen-provider.js";
import { SlashNamesSchema } from "../../shared/schema/slash-command.schema.js";
import type { SlashName } from "../../shared/schema/slash-command.schema.js";

const SLASH_ALWAYS: readonly SlashName[] = ["clear"];
const SLASH_WITH_COMPACT: readonly SlashName[] = ["clear", "compact"];

export const SlashCommandsQuery = query("slash-commands")
	.output(SlashNamesSchema)
	.inject({
		assistantSession: AssistantSessionGateway,
		assistantSetup: AssistantSetupGateway,
	})
	.handle(async (_input, { assistantSession, assistantSetup }) => {
		if (!assistantSession.isAvailable()) {
			return [];
		}

		const { compacts } = chosenOf(await assistantSetup.setup());
		return [...(compacts ? SLASH_WITH_COMPACT : SLASH_ALWAYS)];
	});

export const CompactChatCommand = command("compact-chat")
	.idempotencyKey(Repeatable)
	.inject({ assistantSession: AssistantSessionGateway })
	.handle(async (_input, { assistantSession }) => {
		await assistantSession.compact();
	});

export const RereadSlashCommandsSubscriber = subscriber(AssistantSetupChangedEvent).handle((_input, { invalidate }) => {
	invalidate(SlashCommandsQuery);
});
