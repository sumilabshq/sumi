import { PerCall, command, query } from "@widgetarium/core/requests";
import { ComposerPrefillGateway } from "../../gateways/composer-prefill/composer-prefill.gateway.js";
import { ComposerPrefillSchema, PrefillAskedSchema } from "../../shared/schema/composer-prefill.schema.js";

const PREFILLED = "another app asked for a draft";

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
			id: (was?.id ?? 0) + 1,
			text,
		});
		console.debug(
			`[widgetarium] composer prefill ${JSON.stringify(was?.text ?? null)} → ${JSON.stringify(text)} (${PREFILLED})`,
		);
	});
