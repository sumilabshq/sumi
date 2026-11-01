import { Repeatable, command, deny, guard, query, subscriber } from "@widgetarium/core/requests";
import { ThemeChangedEvent } from "../../gateways/theme/theme.events.js";
import { ThemeGateway } from "../../gateways/theme/theme.gateway.js";
import { ChooseThemeInputSchema, ThemeSchema } from "../../shared/schema/theme.schema.js";
import { schemeOf } from "./lib/scheme.js";

const NOT_FOR_APPS = "only Sumi itself chooses its theme; an app reads it";

export const StudioCallerGuard = guard().handle(({ context }) => {
	if (context.user !== null) {
		deny(NOT_FOR_APPS);
	}
});

export const ThemeQuery = query("theme")
	.output(ThemeSchema)
	.inject({ theme: ThemeGateway })
	.handle((_input, { theme }) => {
		const choice = theme.choice();
		return {
			scheme: schemeOf(choice, theme.systemScheme()),
			choice,
		};
	});

export const ChooseThemeCommand = command("choose-theme")
	.input(ChooseThemeInputSchema)
	.idempotencyKey(Repeatable)
	.guard(StudioCallerGuard)
	.inject({ theme: ThemeGateway })
	.handle(({ choice }, { theme, invalidate }) => {
		const was = theme.choice();

		if (was === choice) {
			console.info(`[widgetarium] theme choice ${choice} kept (already chosen)`);
			return;
		}

		const reason = `theme choice ${was} → ${choice} (chosen in the studio)`;
		theme.saveChoice(choice, reason);
		invalidate(ThemeQuery);
		console.info(`[widgetarium] ${reason}`);
	});

export const RereadThemeSubscriber = subscriber(ThemeChangedEvent).handle((_input, { invalidate }) => {
	invalidate(ThemeQuery);
});
