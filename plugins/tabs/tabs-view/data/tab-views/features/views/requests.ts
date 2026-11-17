import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { viewsChanged } from "../../gateways/views/views.events.js";
import { ChooseViewSchema, ChosenViewSchema } from "../../shared/schema/views.schema.js";

export const chosen = query()
	.public()
	.output(ChosenViewSchema)
	.handle(async (_input, { views }) => ({ view: await views.chosen() }));

export const choose = command()
	.public()
	.input(ChooseViewSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ view }, { views, invalidate }) => {
		invalidate(chosen);
		const was = await views.chosen();

		if (was === view) {
			console.info(`[widgetarium] tabs view ${view} skipped: already chosen`);
			return;
		}

		const reason = `tabs view ${was ?? "first"} → ${view}`;
		await views.choose(view, reason);
		console.info(`[widgetarium] ${reason}`);
	});

export const reread = subscriber(viewsChanged).handle((_input, { invalidate }) => {
	invalidate(chosen);
});
