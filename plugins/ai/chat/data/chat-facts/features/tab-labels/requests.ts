import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { answered, moving } from "@widgetarium/navigation/lib/shared/lib/settling/settling";
import { placedTabsChanged } from "../../gateways/tabs/tabs.events.js";
import { AdoptedLabelSchema, ChatTabLabelsSchema } from "../../shared/schema/chat-facts.schema.js";
import { chatTabLabelsOf, dropLabelPlan } from "./lib/label-plans.js";

export const all = query()
	.public()
	.output(ChatTabLabelsSchema)
	.handle(async (_input, { tabs, placedApps }) => ({
		labels: [...chatTabLabelsOf({ ...(await tabs.placedTabs()), apps: placedApps.placedApps() })],
	}));

export const drop = command()
	.public()
	.input(AdoptedLabelSchema)
	.idempotencyKey(Repeatable)
	.handle(async (adopted, { tabs, placedApps, invalidate }) => {
		invalidate(all);
		answered(await tabs.movePlacedTabs(moving(null, placedApps.placedApps(), dropLabelPlan(adopted))));
	});

export const rereadLabels = subscriber(placedTabsChanged).handle((_input, { invalidate }) => {
	invalidate(all);
});
