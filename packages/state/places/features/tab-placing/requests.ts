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
	.handle(async ({ at, id, place }, { tabs }) =>
		settledOf(await tabs.movePlacedTabs(settling(at, placeTabPlan(id, place)))),
	);

export const MakeEssentialCommand = command("make-essential")
	.public()
	.input(MakeEssentialAskSchema)
	.output(EssentialFaceSchema)
	.idempotencyKey(Repeatable)
	.handle(
		async ({ at, id, essentialId }, { tabs }) =>
			answered(await tabs.movePlacedTabs(settlingWith(at, makeEssentialPlan(id, essentialId)))).extra,
	);

export const RenameTabCommand = command("rename-tab")
	.public()
	.input(RenameTabAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, id, label }, { tabs }) => {
		answered(await tabs.movePlacedTabs(moving(window, renamePlan(id, label))));
	});

export const PinTabCommand = command("pin-tab")
	.public()
	.input(PinTabAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, id, isPinned }, { tabs }) => {
		answered(await tabs.movePlacedTabs(moving(window, pinPlan(id, isPinned))));
	});

export const FoldTabCommand = command("fold-tab")
	.public()
	.input(FoldTabAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, id }, { tabs }) => {
		answered(await tabs.movePlacedTabs(moving(window, foldTabPlan(id))));
	});

export const CreateGroupCommand = command("create-group")
	.public()
	.input(CreateGroupAskSchema)
	.output(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ window, ...ask }, { tabs }) => ({
		id: answered(await tabs.movePlacedTabs(moving(window, createGroupPlan(ask)))),
	}));

export const RenameGroupCommand = command("rename-group")
	.public()
	.input(RenameGroupAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, id, name }, { tabs }) => {
		answered(await tabs.movePlacedTabs(moving(window, renameGroupPlan(id, name))));
	});

export const SetGroupHueCommand = command("set-group-hue")
	.public()
	.input(GroupHueAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, id, hue }, { tabs }) => {
		answered(await tabs.movePlacedTabs(moving(window, groupHuePlan(id, hue))));
	});

export const FoldGroupCommand = command("fold-group")
	.public()
	.input(GroupAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, id }, { tabs }) => {
		answered(await tabs.movePlacedTabs(moving(window, foldGroupPlan(id))));
	});

export const PlaceGroupCommand = command("place-group")
	.public()
	.input(PlaceGroupAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, id, place }, { tabs }) => {
		answered(await tabs.movePlacedTabs(moving(window, placeGroupPlan(id, place))));
	});

export const UngroupCommand = command("ungroup")
	.public()
	.input(GroupAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, id }, { tabs }) => {
		answered(await tabs.movePlacedTabs(moving(window, ungroupPlan(id))));
	});
