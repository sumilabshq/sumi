import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { themeChanged } from "../../gateways/theme/theme.events.js";
import { ChooseThemeInputSchema, ThemeSchema } from "../../shared/schema/theme.schema.js";
import { StudioCallerGuard } from "../../shared/lib/studio-caller-guard.js";
import { schemeOf } from "./lib/scheme.js";

export const current = query()
	.public()
	.output(ThemeSchema)
	.handle((_input, { theme }) => {
		const choice = theme.choice();
		return {
			scheme: schemeOf(choice, theme.systemScheme()),
			choice,
		};
	});

export const choose = command()
	.public()
	.input(ChooseThemeInputSchema)
	.idempotencyKey(Repeatable)
	.guard(StudioCallerGuard)
	.handle(({ choice }, { theme: themeGateway, invalidate }) => {
		const was = themeGateway.choice();

		if (was === choice) {
			console.info(`[widgetarium] theme choice ${choice} kept (already chosen)`);
			return;
		}

		const reason = `theme choice ${was} → ${choice} (chosen in the studio)`;
		themeGateway.saveChoice(choice, reason);
		invalidate(current);
		console.info(`[widgetarium] ${reason}`);
	});

export const reread = subscriber(themeChanged).handle((_input, { invalidate }) => {
	invalidate(current);
});
