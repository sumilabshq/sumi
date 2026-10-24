import { Repeatable, command, query, refuse, subscriber } from "@widgetarium/core/requests";
import { EssentialsGateway } from "../../gateways/essentials/essentials.gateway.js";
import { HostTabsChangedEvent } from "../../gateways/host-tabs/host-tabs.events.js";
import { HostTabsGateway } from "../../gateways/host-tabs/host-tabs.gateway.js";
import { PaneFlashGateway } from "../../gateways/pane-flash/pane-flash.gateway.js";
import { ShownViewGateway } from "../../gateways/shown-view/shown-view.gateway.js";
import { withClosedReopened } from "../../shared/lib/tab-showing/reopening.js";
import {
	EFFECT_COMMANDS,
	FACT_QUERIES,
	factsOf,
	settle,
	tabsNowOf,
} from "../../shared/lib/tab-showing/tab-settling.js";
import { ClosedTabIdSchema, ClosedTabsSchema } from "../../shared/schema/closed-tab.schema.js";
import { closedRowsOf } from "./lib/closed-rows.js";

export const ClosedTabsQuery = query("closed-tabs")
	.output(ClosedTabsSchema)
	.settlesNow()
	.inject({ hostTabs: HostTabsGateway })
	.handle((_input, { hostTabs }) => ({ tabs: closedRowsOf(hostTabs.tabs()?.closed ?? []) }));

export const ReopenClosedTabByIdCommand = command("reopen-closed-tab-by-id")
	.input(ClosedTabIdSchema)
	.idempotencyKey(Repeatable)
	.inject({
		hostTabs: HostTabsGateway,
		essentials: EssentialsGateway,
		shownView: ShownViewGateway,
		paneFlash: PaneFlashGateway,
	})
	.sends(...FACT_QUERIES, ...EFFECT_COMMANDS)
	.handle(async ({ tabId }, { send, invalidate, ...parts }) => {
		invalidate(ClosedTabsQuery);
		const facts = await factsOf(parts, send);
		const { showing } = tabsNowOf(parts, facts);
		const reopened = withClosedReopened(showing, facts, tabId);

		if (reopened === null) {
			return refuse(`the tab "${tabId}" is not among the closed tabs`);
		}

		return settle(showing, reopened, { parts, send });
	});

export const RereadClosedTabsSubscriber = subscriber(HostTabsChangedEvent).handle((_input, { invalidate }) => {
	invalidate(ClosedTabsQuery);
});
