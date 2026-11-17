import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { setupChanged } from "../../gateways/chat-parts/chat-parts.events.js";
import { chosenOf } from "../../shared/lib/chosen-provider.js";
import { SlashNamesSchema } from "../../shared/schema/slash-command.schema.js";
import type { SlashName } from "../../shared/schema/slash-command.schema.js";
import { ChatKeySchema } from "../../shared/schema/chat-key.schema.js";
import { inChat } from "../../gateways/chat-parts/in-chat.js";

const SLASH_ALWAYS: readonly SlashName[] = ["clear", "rename"];
const SLASH_WITH_COMPACT: readonly SlashName[] = ["clear", "compact", "rename"];

export const all = query()
	.public()
	.input(ChatKeySchema)
	.output(SlashNamesSchema)
	.handle(
		inChat(async (_input, { assistantSession, assistantSetup }) => {
			if (!assistantSession.isAvailable()) {
				return [];
			}

			const { compacts } = chosenOf(await assistantSetup.setup());
			return [...(compacts ? SLASH_WITH_COMPACT : SLASH_ALWAYS)];
		}),
	);

export const compactChat = command()
	.public()
	.input(ChatKeySchema)
	.idempotencyKey(Repeatable)
	.handle(
		inChat(async (_input, { assistantSession }) => {
			await assistantSession.compact();
		}),
	);

export const rereadSlashCommands = subscriber(setupChanged).handle((_input, { invalidate }) => {
	invalidate(all);
});
