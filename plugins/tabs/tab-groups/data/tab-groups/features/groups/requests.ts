import { Repeatable, deny, guard } from "@widgetarium/data-framework";
import { command } from "#module";
import { answered, moving } from "@widgetarium/navigation/lib/shared/lib/settling/settling";
import {
	CreatedGroupSchema,
	CreateGroupAskSchema,
	GroupAskSchema,
	GroupHueAskSchema,
	PlaceGroupAskSchema,
	RenameGroupAskSchema,
} from "../../shared/schema/group-asks.schema.js";
import {
	createGroupPlan,
	foldGroupPlan,
	groupHuePlan,
	placeGroupPlan,
	renameGroupPlan,
	ungroupPlan,
} from "./lib/group-plans.js";

const NOT_FOR_APPS = "{request} is not open to apps: groups are the studio's own";

export const StudioCallersGuard = guard().handle(({ request, context }) => {
	if (context.user !== null) {
		deny(NOT_FOR_APPS.replace("{request}", request));
	}
});

export const create = command()
	.public()
	.input(CreateGroupAskSchema)
	.output(CreatedGroupSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, ...ask }, { tabs, placedApps }) => ({
		id: answered(await tabs.movePlacedTabs(moving(window, placedApps.placedApps(), createGroupPlan(ask)))),
	}));

export const rename = command()
	.public()
	.input(RenameGroupAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, id, name }, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(window, placedApps.placedApps(), renameGroupPlan(id, name))));
	});

export const setHue = command()
	.public()
	.input(GroupHueAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, id, hue }, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(window, placedApps.placedApps(), groupHuePlan(id, hue))));
	});

export const fold = command()
	.public()
	.input(GroupAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, id }, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(window, placedApps.placedApps(), foldGroupPlan(id))));
	});

export const place = command()
	.public()
	.input(PlaceGroupAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, id, place }, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(window, placedApps.placedApps(), placeGroupPlan(id, place))));
	});

export const ungroup = command()
	.public()
	.input(GroupAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, id }, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(window, placedApps.placedApps(), ungroupPlan(id))));
	});
