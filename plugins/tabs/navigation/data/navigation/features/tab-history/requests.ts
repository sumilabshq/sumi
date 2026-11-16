import { Repeatable } from "@widgetarium/data-framework";
import { command } from "#module";
import { answered, moving } from "../../shared/lib/settling/settling.js";
import { TabStepSchema } from "../../shared/schema/tab-facts.schema.js";
import { steppedPlan } from "./lib/history-plans.js";

export const goBack = command()
	.public()
	.input(TabStepSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(null, placedApps.placedApps(), steppedPlan(id, "back"))));
	});

export const goForward = command()
	.public()
	.input(TabStepSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(null, placedApps.placedApps(), steppedPlan(id, "forward"))));
	});
