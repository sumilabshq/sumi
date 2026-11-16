import { Repeatable, refuse } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { choiceChanged } from "../../gateways/choice/choice.events.js";
import { homePageVerdictOf, shownHomePageOf } from "../../shared/lib/home-page-choice.js";
import { HomePageChoiceSchema, HomePagesSchema } from "../../shared/schema/home-pages.schema.js";

export const all = query()
	.public()
	.output(HomePagesSchema)
	.handle(async (_input, { choice, pages }) => ({
		pages,
		chosen: shownHomePageOf(await choice.keptChoice(), pages),
	}));

export const choose = command()
	.public()
	.input(HomePageChoiceSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { choice, pages, invalidate }) => {
		const verdict = homePageVerdictOf(id, pages);

		if (!verdict.isAllowed) {
			console.info(`[widgetarium] home page → ${id} refused: ${verdict.reason}`);
			return refuse(verdict.reason);
		}

		const was = await choice.keptChoice();

		if (was === id) {
			console.info(`[widgetarium] home page ${id} → ${id} skipped: already chosen`);
			return;
		}

		invalidate(all);
		await choice.keepChoice(id, `home page ${was ?? "none"} → ${id}`);
		console.info(`[widgetarium] home page ${was ?? "none"} → ${id}`);
	});

export const reread = subscriber(choiceChanged).handle((_input, { invalidate }) => {
	invalidate(all);
});
