import { Repeatable } from "@widgetarium/data-framework";
import { command } from "#module";
import { answered, moving, settledOf, settling } from "../../shared/lib/settling/settling.js";
import { TabsSettledSchema } from "../../shared/schema/screen.schema.js";
import { FoldTabAskSchema, PlaceTabAskSchema, RenameTabAskSchema } from "../../shared/schema/tab-asks.schema.js";
import { foldPlan, placeTabPlan, renamePlan } from "./lib/placing-plans.js";

export const place = command()
	.public()
	.input(PlaceTabAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, id, place }, { tabs, placedApps }) =>
		settledOf(await tabs.movePlacedTabs(settling(at, placedApps.placedApps(), placeTabPlan(id, place)))),
	);

export const rename = command()
	.public()
	.input(RenameTabAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, id, label }, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(window, placedApps.placedApps(), renamePlan(id, label))));
	});

export const fold = command()
	.public()
	.input(FoldTabAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, id }, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(window, placedApps.placedApps(), foldPlan(id))));
	});
