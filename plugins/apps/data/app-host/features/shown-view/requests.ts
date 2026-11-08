import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { places } from "@widgetarium/places/contract";
import { studioCoreChanged } from "../../gateways/core-changes/core-changes.events.js";
import { tabsSettled } from "../../shared/events/tabs.events.js";
import { StudioViewSchema } from "../../shared/schema/studio-view.schema.js";
import { ViewToShowSchema } from "../../shared/schema/view-to-show.schema.js";

export const current = query()
	.public()
	.output(StudioViewSchema)
	.handle((_input, { send, studioWindow }) => send(places.tabs.shownView, { window: studioWindow.windowLabel() }));

export const showView = command()
	.public()
	.input(ViewToShowSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ view }, { send, emit, studioWindow }) => {
		await send(places.tabShowing.showView, { window: studioWindow.windowLabel(), view });
		emit(tabsSettled);
	});

export const rereadShownView = subscriber(tabsSettled).handle((_input, { invalidate }) => {
	invalidate(current);
});

export const rereadShownViewForCore = subscriber(studioCoreChanged).handle((_input, { invalidate }) => {
	invalidate(current);
});
