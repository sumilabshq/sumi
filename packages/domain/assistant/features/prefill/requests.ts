import { PerCall, Repeatable, command, query } from "@widgetarium/core/requests";
import { ComposerPrefillGateway } from "../../gateways/composer-prefill/composer-prefill.gateway.js";
import { ComposerPrefillSchema, PrefillAskedSchema, PrefillTakenSchema } from "../../shared/schema/composer-prefill.schema.js";

const PREFILLED = "another app asked for a draft";
const TAKEN = "the composer took it";

export const ComposerPrefillQuery = query("composer-prefill")
	.output(ComposerPrefillSchema.nullable())
	.settlesNow()
	.inject({ composerPrefill: ComposerPrefillGateway })
	.handle((_input, { composerPrefill }) => composerPrefill.composerPrefill());

export const PrefillDraftCommand = command("prefill-draft")
	.input(PrefillAskedSchema)
	.idempotencyKey(PerCall)
	.inject({ composerPrefill: ComposerPrefillGateway })
	.handle(({ text }, { composerPrefill, invalidate }) => {
		invalidate(ComposerPrefillQuery);
		const was = composerPrefill.composerPrefill();
		composerPrefill.saveComposerPrefill({
			id: composerPrefill.lastPrefillId() + 1,
			text,
		});
		console.debug(
			`[widgetarium] composer prefill ${JSON.stringify(was?.text ?? null)} → ${JSON.stringify(text)} (${PREFILLED})`,
		);
	});

export const TakePrefillCommand = command("take-prefill")
	.input(PrefillTakenSchema)
	.idempotencyKey(Repeatable)
	.inject({ composerPrefill: ComposerPrefillGateway })
	.handle(({ id }, { composerPrefill, invalidate }) => {
		const was = composerPrefill.composerPrefill();

		if (was?.id !== id) {
			console.debug(`[widgetarium] composer prefill ${String(id)} not taken: the waiting one is ${String(was?.id ?? null)}`);
			return;
		}

		invalidate(ComposerPrefillQuery);
		composerPrefill.saveComposerPrefill(null);
		console.debug(`[widgetarium] composer prefill ${JSON.stringify(was.text)} → null (${TAKEN})`);
	});
