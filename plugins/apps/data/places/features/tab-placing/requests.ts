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

export const PlaceTabCommand = command("place-tab")
	.public()
	.input(PlaceTabAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, id, place }, { tabs, placedApps }) =>
		settledOf(await tabs.movePlacedTabs(settling(at, placedApps.placedApps(), placeTabPlan(id, place)))),
	);

export const MakeEssentialCommand = command("make-essential")
	.public()
	.input(MakeEssentialAskSchema)
	.output(EssentialFaceSchema)
	.idempotencyKey(Repeatable)
	.handle(
		async ({ at, id, essentialId }, { tabs, placedApps }) =>
			answered(await tabs.movePlacedTabs(settlingWith(at, placedApps.placedApps(), makeEssentialPlan(id, essentialId))))
				.extra,
	);

export const RenameTabCommand = command("rename-tab")
	.public()
	.input(RenameTabAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, id, label }, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(window, placedApps.placedApps(), renamePlan(id, label))));
	});

export const PinTabCommand = command("pin-tab")
	.public()
	.input(PinTabAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, id, isPinned }, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(window, placedApps.placedApps(), pinPlan(id, isPinned))));
	});

export const FoldTabCommand = command("fold-tab")
	.public()
	.input(FoldTabAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, id }, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(window, placedApps.placedApps(), foldTabPlan(id))));
	});

export const CreateGroupCommand = command("create-group")
	.public()
	.input(CreateGroupAskSchema)
	.output(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ window, ...ask }, { tabs, placedApps }) => ({
		id: answered(await tabs.movePlacedTabs(moving(window, placedApps.placedApps(), createGroupPlan(ask)))),
	}));

export const RenameGroupCommand = command("rename-group")
	.public()
	.input(RenameGroupAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, id, name }, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(window, placedApps.placedApps(), renameGroupPlan(id, name))));
	});

export const SetGroupHueCommand = command("set-group-hue")
	.public()
	.input(GroupHueAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, id, hue }, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(window, placedApps.placedApps(), groupHuePlan(id, hue))));
	});

export const FoldGroupCommand = command("fold-group")
	.public()
	.input(GroupAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, id }, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(window, placedApps.placedApps(), foldGroupPlan(id))));
	});

export const PlaceGroupCommand = command("place-group")
	.public()
	.input(PlaceGroupAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, id, place }, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(window, placedApps.placedApps(), placeGroupPlan(id, place))));
	});

export const UngroupCommand = command("ungroup")
	.public()
	.input(GroupAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, id }, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(window, placedApps.placedApps(), ungroupPlan(id))));
	});
