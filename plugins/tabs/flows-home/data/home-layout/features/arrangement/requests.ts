import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { arrangementChanged } from "../../gateways/arrangement/arrangement.events.js";
import { ArrangeAppsAskSchema, ArrangeSetupsAskSchema, ArrangementSchema } from "../../shared/schema/arrangement.schema.js";
import { appsMovedReason, setupsMovedReason } from "./lib/arrangement-logs.js";

export const all = query()
	.public()
	.output(ArrangementSchema)
	.handle((_input, { arrangement }) => arrangement.arrangement());

export const arrangeSetups = command()
	.public()
	.input(ArrangeSetupsAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ setupIds }, { arrangement, invalidate }) => {
		const was = await arrangement.arrangement();
		invalidate(all);
		await arrangement.keepArrangement({ setupIds }, setupsMovedReason(was.setupIds, setupIds));
	});

export const arrangeApps = command()
	.public()
	.input(ArrangeAppsAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ apps, hiddenApps }, { arrangement, invalidate }) => {
		const was = await arrangement.arrangement();
		invalidate(all);
		await arrangement.keepArrangement({ apps, hiddenApps }, appsMovedReason(was, { apps, hiddenApps }));
	});

export const rereadArrangement = subscriber(arrangementChanged).handle((_input, { invalidate }) => {
	invalidate(all);
});
