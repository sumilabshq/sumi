import { PerCall, Repeatable } from "@widgetarium/data-framework";
import { command, query } from "#module";
import {
	ComposerPrefillSchema,
	PrefillAskedSchema,
	PrefillTakenSchema,
} from "../../shared/schema/composer-prefill.schema.js";
import { ChatKeySchema } from "../../shared/schema/chat-key.schema.js";
import { inChat } from "../../gateways/chat-parts/in-chat.js";

const PREFILLED = "another app asked for a draft";
const TAKEN = "the composer took it";

export const composer = query()
	.public()
	.input(ChatKeySchema)
	.output(ComposerPrefillSchema.nullable())
	.settlesNow()
	.handle(inChat((_input, { composerPrefill }) => composerPrefill.composerPrefill()));

export const prefillDraft = command()
	.public()
	.input(PrefillAskedSchema)
	.idempotencyKey(PerCall)
	.handle(
		inChat(({ text }, { composerPrefill: composerPrefillGateway, invalidate }) => {
			invalidate(composer);
			const was = composerPrefillGateway.composerPrefill();
			composerPrefillGateway.saveComposerPrefill({
				id: composerPrefillGateway.lastPrefillId() + 1,
				text,
			});
			console.debug(
				`[widgetarium] composer prefill ${JSON.stringify(was?.text ?? null)} → ${JSON.stringify(text)} (${PREFILLED})`,
			);
		}),
	);

export const take = command()
	.public()
	.input(PrefillTakenSchema)
	.idempotencyKey(Repeatable)
	.handle(
		inChat(({ id }, { composerPrefill: composerPrefillGateway, invalidate }) => {
			const was = composerPrefillGateway.composerPrefill();

			if (was?.id !== id) {
				console.debug(
					`[widgetarium] composer prefill ${String(id)} not taken: the waiting one is ${String(was?.id ?? null)}`,
				);
				return;
			}

			invalidate(composer);
			composerPrefillGateway.saveComposerPrefill(null);
			console.debug(`[widgetarium] composer prefill ${JSON.stringify(was.text)} → null (${TAKEN})`);
		}),
	);
