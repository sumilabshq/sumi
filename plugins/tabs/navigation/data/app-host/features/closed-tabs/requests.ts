import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { navigation } from "@widgetarium/navigation/contract";
import { studioCoreChanged } from "../../gateways/core-changes/core-changes.events.js";
import { tabsSettled } from "../../shared/events/tabs.events.js";
import { settleAsked } from "../../shared/lib/tab-showing/tab-settling.js";
import { pageTitlesOf } from "../../shared/lib/page-titles/page-titles-read.js";
import { pageTabsOfClosed, titledClosedOf } from "../../shared/lib/page-titles/page-titles.js";
import { ClosedTabIdSchema, ClosedTabsSchema } from "../../shared/schema/closed-tab.schema.js";

export const closedTabs = query()
	.public()
	.output(ClosedTabsSchema)
	.handle(async (_input, { send }) => {
		const closed = await send(navigation.tabs.closedTabs);
		const titles = await pageTitlesOf(send, pageTabsOfClosed(closed.tabs));
		return { tabs: closed.tabs.map((row) => titledClosedOf(row, titles)) };
	});

export const reopenById = command()
	.public()
	.input(ClosedTabIdSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ tabId }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(navigation.tabOpening.reopenClosed, { at, tabId }),
		);
	});

export const rereadClosedTabs = subscriber(tabsSettled).handle((_input, { invalidate }) => {
	invalidate(closedTabs);
});

export const rereadClosedTabsForCore = subscriber(studioCoreChanged).handle((_input, { invalidate }) => {
	invalidate(closedTabs);
});
