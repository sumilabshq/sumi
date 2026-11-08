import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { ShowViewCommand as PlacesShowViewCommand, ShownViewQuery as PlacesShownViewQuery } from "@widgetarium/places";
import { StudioCoreChangedEvent } from "../../gateways/core-changes/core-changes.events.js";
import { TabsSettledEvent } from "../../shared/events/tabs.events.js";
import { StudioViewSchema } from "../../shared/schema/studio-view.schema.js";
import { ViewToShowSchema } from "../../shared/schema/view-to-show.schema.js";

export const ShownViewQuery = query("shown-view")
	.public()
	.output(StudioViewSchema)
	.handle((_input, { send, studioWindow }) => send(PlacesShownViewQuery, { window: studioWindow.windowLabel() }));

export const ShowViewCommand = command("show-view")
	.public()
	.input(ViewToShowSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ view }, { send, emit, studioWindow }) => {
		await send(PlacesShowViewCommand, { window: studioWindow.windowLabel(), view });
		emit(TabsSettledEvent);
	});

export const RereadShownViewSubscriber = subscriber(TabsSettledEvent).handle((_input, { invalidate }) => {
	invalidate(ShownViewQuery);
});

export const RereadShownViewForCoreSubscriber = subscriber(StudioCoreChangedEvent).handle((_input, { invalidate }) => {
	invalidate(ShownViewQuery);
});
