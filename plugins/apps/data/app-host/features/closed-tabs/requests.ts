import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import {
	ClosedTabsQuery as PlacedClosedTabsQuery,
	ReopenClosedTabCommand as PlacesReopenClosedTabCommand,
} from "@widgetarium/places";
import { StudioCoreChangedEvent } from "../../gateways/core-changes/core-changes.events.js";
import { TabsSettledEvent } from "../../shared/events/tabs.events.js";
import { settleAsked } from "../../shared/lib/tab-showing/tab-settling.js";
import { pageTitlesOf } from "../../shared/lib/page-titles/page-titles-read.js";
import { pageTabsOfClosed, titledClosedOf } from "../../shared/lib/page-titles/page-titles.js";
import { ClosedTabIdSchema, ClosedTabsSchema } from "../../shared/schema/closed-tab.schema.js";

export const ClosedTabsQuery = query("closed-tabs")
	.public()
	.output(ClosedTabsSchema)
	.handle(async (_input, { send }) => {
		const closed = await send(PlacedClosedTabsQuery);
		const titles = await pageTitlesOf(send, pageTabsOfClosed(closed.tabs));
		return { tabs: closed.tabs.map((row) => titledClosedOf(row, titles)) };
	});

export const ReopenClosedTabByIdCommand = command("reopen-closed-tab-by-id")
	.public()
	.input(ClosedTabIdSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ tabId }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesReopenClosedTabCommand, { at, tabId }),
		);
	});

export const RereadClosedTabsSubscriber = subscriber(TabsSettledEvent).handle((_input, { invalidate }) => {
	invalidate(ClosedTabsQuery);
});

export const RereadClosedTabsForCoreSubscriber = subscriber(StudioCoreChangedEvent).handle((_input, { invalidate }) => {
	invalidate(ClosedTabsQuery);
});
