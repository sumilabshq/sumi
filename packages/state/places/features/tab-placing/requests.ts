import { z } from "zod";
import { Repeatable, command } from "@widgetarium/core/requests";
import { TabsGateway } from "../../gateways/tabs/tabs.gateway.js";
import { answered, moving, settledOf, settling, settlingWith } from "../../shared/lib/settling/settling.js";
import { TabsSettledSchema } from "../../shared/schema/screen.schema.js";
import {
	CreateGroupAskSchema,
	GroupAskSchema,
	GroupHueAskSchema,
	KeepChatTabsAskSchema,
	MakeEssentialAskSchema,
	PinTabAskSchema,
	PlaceTabAskSchema,
	RenameGroupAskSchema,
	RenameTabAskSchema,
} from "../../shared/schema/tab-asks.schema.js";
import { EssentialFaceSchema } from "../../shared/schema/tab-rows.schema.js";
import { createGroupPlan, foldGroupPlan, groupHuePlan, renameGroupPlan, ungroupPlan } from "./lib/group-plans.js";
import { keepChatTabsPlan, makeEssentialPlan, pinPlan, placeTabPlan, renamePlan } from "./lib/placing-plans.js";

export const PlaceTabCommand = command("place-tab")
	.input(PlaceTabAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ at, id, place }, { tabs }) =>
		settledOf(await tabs.movePlacedTabs(settling(at, placeTabPlan(id, place)))),
	);

export const MakeEssentialCommand = command("make-essential")
	.input(MakeEssentialAskSchema)
	.output(EssentialFaceSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(
		async ({ at, id, essentialId }, { tabs }) =>
			answered(await tabs.movePlacedTabs(settlingWith(at, makeEssentialPlan(id, essentialId)))).extra,
	);

export const RenameTabCommand = command("rename-tab")
	.input(RenameTabAskSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ window, id, label }, { tabs }) => {
		answered(await tabs.movePlacedTabs(moving(window, renamePlan(id, label))));
	});

export const PinTabCommand = command("pin-tab")
	.input(PinTabAskSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ window, id, isPinned }, { tabs }) => {
		answered(await tabs.movePlacedTabs(moving(window, pinPlan(id, isPinned))));
	});

export const KeepChatTabsCommand = command("keep-chat-tabs")
	.input(KeepChatTabsAskSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ chatIds }, { tabs }) => {
		answered(await tabs.movePlacedTabs(moving(null, keepChatTabsPlan(chatIds))));
	});

export const CreateGroupCommand = command("create-group")
	.input(CreateGroupAskSchema)
	.output(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ window, ...ask }, { tabs }) => ({
		id: answered(await tabs.movePlacedTabs(moving(window, createGroupPlan(ask)))),
	}));

export const RenameGroupCommand = command("rename-group")
	.input(RenameGroupAskSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ window, id, name }, { tabs }) => {
		answered(await tabs.movePlacedTabs(moving(window, renameGroupPlan(id, name))));
	});

export const SetGroupHueCommand = command("set-group-hue")
	.input(GroupHueAskSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ window, id, hue }, { tabs }) => {
		answered(await tabs.movePlacedTabs(moving(window, groupHuePlan(id, hue))));
	});

export const FoldGroupCommand = command("fold-group")
	.input(GroupAskSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ window, id }, { tabs }) => {
		answered(await tabs.movePlacedTabs(moving(window, foldGroupPlan(id))));
	});

export const UngroupCommand = command("ungroup")
	.input(GroupAskSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ window, id }, { tabs }) => {
		answered(await tabs.movePlacedTabs(moving(window, ungroupPlan(id))));
	});
