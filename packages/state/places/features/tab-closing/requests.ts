import { Repeatable, command } from "@widgetarium/data-framework";
import { TabsGateway } from "../../gateways/tabs/tabs.gateway.js";
import { settledOf, settling } from "../../shared/lib/settling/settling.js";
import { TabsSettledSchema } from "../../shared/schema/screen.schema.js";
import { CloseEssentialAskSchema, SettleAskSchema, TabAskSchema } from "../../shared/schema/tab-asks.schema.js";
import {
	closeEssentialPlan,
	closeGroupPlan,
	closeOthersPlan,
	closeShownPlan,
	closeTabPlan,
} from "./lib/closing-plans.js";

export const CloseTabCommand = command("close-tab")
	.input(TabAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ at, id }, { tabs }) => settledOf(await tabs.movePlacedTabs(settling(at, closeTabPlan(id)))));

export const CloseOtherTabsCommand = command("close-other-tabs")
	.input(TabAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ at, id }, { tabs }) => settledOf(await tabs.movePlacedTabs(settling(at, closeOthersPlan(id)))));

export const CloseShownTabCommand = command("close-shown-tab")
	.input(SettleAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ at }, { tabs }) => settledOf(await tabs.movePlacedTabs(settling(at, closeShownPlan()))));

export const CloseGroupCommand = command("close-group")
	.input(TabAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ at, id }, { tabs }) => settledOf(await tabs.movePlacedTabs(settling(at, closeGroupPlan(id)))));

export const CloseEssentialTabCommand = command("close-essential-tab")
	.input(CloseEssentialAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ at, essentialId }, { tabs }) =>
		settledOf(await tabs.movePlacedTabs(settling(at, closeEssentialPlan(essentialId)))),
	);
