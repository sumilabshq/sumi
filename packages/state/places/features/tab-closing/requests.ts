import { Repeatable } from "@widgetarium/data-framework";
import { command } from "#module";
import { settledOf, settling } from "../../shared/lib/settling/settling.js";
import { TabsSettledSchema } from "../../shared/schema/screen.schema.js";
import { CloseEssentialAskSchema, SettleAskSchema, TabAskSchema } from "../../shared/schema/tab-asks.schema.js";
import { closeEssentialPlan, closeGroupPlan, closeOthersPlan, closeShownPlan, closeTabPlan } from "./lib/closing-plans.js";

export const CloseTabCommand = command("close-tab")
	.public()
	.input(TabAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, id }, { tabs }) => settledOf(await tabs.movePlacedTabs(settling(at, closeTabPlan(id)))));

export const CloseOtherTabsCommand = command("close-other-tabs")
	.public()
	.input(TabAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, id }, { tabs }) => settledOf(await tabs.movePlacedTabs(settling(at, closeOthersPlan(id)))));

export const CloseShownTabCommand = command("close-shown-tab")
	.public()
	.input(SettleAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at }, { tabs }) => settledOf(await tabs.movePlacedTabs(settling(at, closeShownPlan()))));

export const CloseGroupCommand = command("close-group")
	.public()
	.input(TabAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, id }, { tabs }) => settledOf(await tabs.movePlacedTabs(settling(at, closeGroupPlan(id)))));

export const CloseEssentialTabCommand = command("close-essential-tab")
	.public()
	.input(CloseEssentialAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, essentialId }, { tabs }) =>
		settledOf(await tabs.movePlacedTabs(settling(at, closeEssentialPlan(essentialId)))),
	);
