import { Repeatable, command } from "@widgetarium/data-framework";
import { TabsGateway } from "../../gateways/tabs/tabs.gateway.js";
import { answered, moving } from "../../shared/lib/settling/settling.js";
import { TabStepSchema } from "../../shared/schema/tab-facts.schema.js";
import { steppedPlan } from "./lib/history-plans.js";

export const GoBackInTabCommand = command("go-back-in-tab")
	.input(TabStepSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ id }, { tabs }) => {
		answered(await tabs.movePlacedTabs(moving(null, steppedPlan(id, "back"))));
	});

export const GoForwardInTabCommand = command("go-forward-in-tab")
	.input(TabStepSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ id }, { tabs }) => {
		answered(await tabs.movePlacedTabs(moving(null, steppedPlan(id, "forward"))));
	});
