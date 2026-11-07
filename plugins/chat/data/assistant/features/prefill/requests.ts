import { PerCall, Repeatable, command, query } from "@widgetarium/data-framework";
import {
	ComposerPrefillSchema,
	PrefillAskedSchema,
	PrefillTakenSchema,
} from "../../shared/schema/composer-prefill.schema.js";
import { ChatKeySchema } from "../../shared/schema/chat-key.schema.js";
import { inChat } from "../../gateways/chat-parts/in-chat.js";
import { ChatPartsGateway } from "../../gateways/chat-parts/chat-parts.gateway.js";

const PREFILLED = "another app asked for a draft";
const TAKEN = "the composer took it";

export const ComposerPrefillQuery = query("composer-prefill")
	.input(ChatKeySchema)
	.output(ComposerPrefillSchema.nullable())
	.settlesNow()
	.inject({ chatParts: ChatPartsGateway })
	.handle(inChat((_input, { composerPrefill }) => composerPrefill.composerPrefill()));

export const PrefillDraftCommand = command("prefill-draft")
	.input(PrefillAskedSchema)
	.idempotencyKey(PerCall)
	.inject({ chatParts: ChatPartsGateway })
	.handle(
		inChat(({ text }, { composerPrefill, invalidate }) => {
			invalidate(ComposerPrefillQuery);
			const was = composerPrefill.composerPrefill();
			composerPrefill.saveComposerPrefill({
				id: composerPrefill.lastPrefillId() + 1,
				text,
			});
			console.debug(
				`[widgetarium] composer prefill ${JSON.stringify(was?.text ?? null)} → ${JSON.stringify(text)} (${PREFILLED})`,
			);
		}),
	);

export const TakePrefillCommand = command("take-prefill")
	.input(PrefillTakenSchema)
	.idempotencyKey(Repeatable)
	.inject({ chatParts: ChatPartsGateway })
	.handle(
		inChat(({ id }, { composerPrefill, invalidate }) => {
			const was = composerPrefill.composerPrefill();

			if (was?.id !== id) {
				console.debug(
					`[widgetarium] composer prefill ${String(id)} not taken: the waiting one is ${String(was?.id ?? null)}`,
				);
				return;
			}

			invalidate(ComposerPrefillQuery);
			composerPrefill.saveComposerPrefill(null);
			console.debug(`[widgetarium] composer prefill ${JSON.stringify(was.text)} → null (${TAKEN})`);
		}),
	);
