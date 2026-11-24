import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { flowsChanged } from "../../gateways/flows/flows.events.js";
import { placedTabsChanged } from "../../gateways/tabs/tabs.events.js";
import { answered } from "../../shared/lib/settling/settling.js";
import { WindowFlowAskSchema } from "../../shared/schema/flow-asks.schema.js";
import { TabsSettledSchema } from "../../shared/schema/screen.schema.js";
import { TrailStepAskSchema, WindowTrailStateSchema } from "../../shared/schema/window-trail.schema.js";
import { trailStateOf, trailStepMove } from "./lib/trail-plans.js";

export const trail = query()
	.public()
	.input(WindowFlowAskSchema)
	.output(WindowTrailStateSchema)
	.handle(async ({ window }, { tabs }) => trailStateOf(await tabs.places(), window));

export const back = command()
	.public()
	.input(TrailStepAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs, placedApps }) =>
		answered(await tabs.movePlaces(trailStepMove(ask, "back", placedApps.placedApps()))),
	);

export const forward = command()
	.public()
	.input(TrailStepAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs, placedApps }) =>
		answered(await tabs.movePlaces(trailStepMove(ask, "forward", placedApps.placedApps()))),
	);

export const rereadTrailOnFlows = subscriber(flowsChanged).handle((_input, { invalidate }) => {
	invalidate(trail);
});

export const rereadTrailOnTabs = subscriber(placedTabsChanged).handle((_input, { invalidate }) => {
	invalidate(trail);
});
