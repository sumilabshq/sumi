import { Repeatable, deny } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { fontsChanged } from "../../gateways/fonts/fonts.events.js";
import { StudioCallerGuard } from "../../shared/lib/studio-caller-guard.js";
import { ChooseFontInputSchema, FontsSchema } from "../../shared/schema/fonts.schema.js";
import { isAvailable } from "../../shared/lib/font-families.js";
import { fontsOf } from "./lib/fonts-of.js";

export const current = query()
	.public()
	.output(FontsSchema)
	.handle((_input, { fonts }) => fontsOf(fonts.chosen()));

export const choose = command()
	.public()
	.input(ChooseFontInputSchema)
	.idempotencyKey(Repeatable)
	.guard(StudioCallerGuard)
	.handle(({ role, family }, { fonts, invalidate }) => {
		if (family !== null && !isAvailable(role, family)) {
			deny(`${family} is not a font Sumi offers for ${role}`);
		}

		const was = fonts.chosen()[role];

		if (was === family) {
			console.info(`[widgetarium] ${role} font ${family ?? "default"} kept (already chosen)`);
			return;
		}

		const reason = `${role} font ${was ?? "default"} → ${family ?? "default"} (chosen in the studio)`;
		fonts.saveChoice(role, family, reason);
		invalidate(current);
		console.info(`[widgetarium] ${reason}`);
	});

export const reread = subscriber(fontsChanged).handle((_input, { invalidate }) => {
	invalidate(current);
});
