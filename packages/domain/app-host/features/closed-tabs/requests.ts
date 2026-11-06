import { Repeatable, command, query, subscriber } from "@widgetarium/data-framework";
import {
	ClosedTabsQuery as PlacedClosedTabsQuery,
	ReopenClosedTabCommand as PlacesReopenClosedTabCommand,
} from "@widgetarium/places";
import { PaneFlashGateway } from "../../gateways/pane-flash/pane-flash.gateway.js";
import { ShownViewGateway } from "../../gateways/shown-view/shown-view.gateway.js";
import { StudioWindowGateway } from "../../gateways/studio-window/studio-window.gateway.js";
import { StudioCoreChangedEvent } from "../../gateways/core-changes/core-changes.events.js";
import { TabsSettledEvent } from "../../shared/events/tabs.events.js";
import { settleAsked } from "../../shared/lib/tab-showing/tab-settling.js";
import { ClosedTabIdSchema, ClosedTabsSchema } from "../../shared/schema/closed-tab.schema.js";

export const ClosedTabsQuery = query("closed-tabs")
	.output(ClosedTabsSchema)
	.handle((_input, { send }) => send(PlacedClosedTabsQuery));

export const ReopenClosedTabByIdCommand = command("reopen-closed-tab-by-id")
	.input(ClosedTabIdSchema)
	.idempotencyKey(Repeatable)
	.inject({
		studioWindow: StudioWindowGateway,
		shownView: ShownViewGateway,
		paneFlash: PaneFlashGateway,
	})
	.emits(TabsSettledEvent)
	.handle(async ({ tabId }, { send, emit, ...parts }) => {
		await settleAsked({ parts, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesReopenClosedTabCommand, { at, tabId }),
		);
	});

export const RereadClosedTabsSubscriber = subscriber(TabsSettledEvent).handle((_input, { invalidate }) => {
	invalidate(ClosedTabsQuery);
});

export const RereadClosedTabsForCoreSubscriber = subscriber(StudioCoreChangedEvent).handle((_input, { invalidate }) => {
	invalidate(ClosedTabsQuery);
});
