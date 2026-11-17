import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { placedTabsChanged } from "../../gateways/tabs/tabs.events.js";
import { WindowLabelSchema } from "../../shared/schema/windows.schema.js";
import { HideSideAskSchema, WindowSidesSchema } from "../../shared/schema/pane-asks.schema.js";
import { leftHiddenMoved } from "./lib/side-moves.js";

export const sides = query()
	.public()
	.input(WindowLabelSchema)
	.output(WindowSidesSchema)
	.handle(async ({ window }, { tabs }) => ({ leftHidden: (await tabs.placedTabs()).views[window]?.leftHidden ?? null }));

export const hideLeft = command()
	.public()
	.input(HideSideAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, isHidden }, { tabs }) => {
		console.info(`[widgetarium] ${await tabs.movePlacedTabs(leftHiddenMoved(window, isHidden))}`);
	});

export const rereadSides = subscriber(placedTabsChanged).handle((_input, { invalidate }) => {
	invalidate(sides);
});
