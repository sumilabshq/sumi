import { z } from "zod";
import { Repeatable } from "@widgetarium/data-framework";
import { command } from "#module";
import { answered, moving, settledOf, settling, settlingWith } from "../../shared/lib/settling/settling.js";
import { TabsSettledSchema } from "../../shared/schema/screen.schema.js";
import {
	CreateGroupAskSchema,
	FoldTabAskSchema,
	GroupAskSchema,
	GroupHueAskSchema,
	MakeEssentialAskSchema,
	PlaceGroupAskSchema,
	PinTabAskSchema,
	PlaceTabAskSchema,
	RenameGroupAskSchema,
	RenameTabAskSchema,
} from "../../shared/schema/tab-asks.schema.js";
import { EssentialFaceSchema } from "../../shared/schema/tab-rows.schema.js";
import {
	createGroupPlan,
	foldGroupPlan,
	groupHuePlan,
	placeGroupPlan,
	renameGroupPlan,
	ungroupPlan,
} from "./lib/group-plans.js";
import { foldTabPlan, makeEssentialPlan, pinPlan, placeTabPlan, renamePlan } from "./lib/placing-plans.js";

export const placeTab = command()
	.public()
	.input(PlaceTabAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, id, place }, { tabs, placedApps }) =>
		settledOf(await tabs.movePlacedTabs(settling(at, placedApps.placedApps(), placeTabPlan(id, place)))),
	);

export const makeEssential = command()
	.public()
	.input(MakeEssentialAskSchema)
	.output(EssentialFaceSchema)
	.idempotencyKey(Repeatable)
	.handle(
		async ({ at, id, essentialId }, { tabs, placedApps }) =>
			answered(await tabs.movePlacedTabs(settlingWith(at, placedApps.placedApps(), makeEssentialPlan(id, essentialId))))
				.extra,
	);

export const renameTab = command()
	.public()
	.input(RenameTabAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, id, label }, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(window, placedApps.placedApps(), renamePlan(id, label))));
	});

export const pinTab = command()
	.public()
	.input(PinTabAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, id, isPinned }, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(window, placedApps.placedApps(), pinPlan(id, isPinned))));
	});

export const foldTab = command()
	.public()
	.input(FoldTabAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, id }, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(window, placedApps.placedApps(), foldTabPlan(id))));
	});

export const createGroup = command()
	.public()
	.input(CreateGroupAskSchema)
	.output(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ window, ...ask }, { tabs, placedApps }) => ({
		id: answered(await tabs.movePlacedTabs(moving(window, placedApps.placedApps(), createGroupPlan(ask)))),
	}));

export const renameGroup = command()
	.public()
	.input(RenameGroupAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, id, name }, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(window, placedApps.placedApps(), renameGroupPlan(id, name))));
	});

export const setGroupHue = command()
	.public()
	.input(GroupHueAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, id, hue }, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(window, placedApps.placedApps(), groupHuePlan(id, hue))));
	});

export const foldGroup = command()
	.public()
	.input(GroupAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, id }, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(window, placedApps.placedApps(), foldGroupPlan(id))));
	});

export const placeGroup = command()
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
