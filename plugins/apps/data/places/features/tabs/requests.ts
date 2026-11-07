import { query, subscriber } from "#module";
import { PlacedTabsChangedEvent } from "../../gateways/tabs/tabs.events.js";
import { closedRowsOf } from "../../shared/lib/rows/closed-rows.js";
import { momentOfWindow, windowTabsOf } from "../../shared/lib/tabs/kept-tabs.js";
import { SettleAskSchema } from "../../shared/schema/tab-asks.schema.js";
import {
	AppTabsSchema,
	ClosedTabsSchema,
	HeldTabsSchema,
	PlacedSidebarSchema,
	SidebarAskSchema,
} from "../../shared/schema/tab-rows.schema.js";
import { ChatTabsSchema, WindowTabsSchema } from "../../shared/schema/tabs.schema.js";
import { WindowLabelSchema } from "../../shared/schema/windows.schema.js";
import { chatTabsOf, heldTabsAt, placedSidebarOf, rowsAt } from "./lib/tab-reads.js";

export const PlacedTabsQuery = query("placed-tabs")
	.public()
	.input(WindowLabelSchema)
	.output(WindowTabsSchema)
	.handle(async ({ window }, { tabs, placedApps }) =>
		windowTabsOf(momentOfWindow(await tabs.placedTabs(), window, placedApps.placedApps())),
	);

export const TabRowsQuery = query("tab-rows")
	.public()
	.input(SettleAskSchema)
	.output(AppTabsSchema)
	.handle(async ({ at }, { tabs, placedApps }) => rowsAt(await tabs.placedTabs(), placedApps.placedApps(), at));

export const SidebarQuery = query("sidebar")
	.public()
	.input(SidebarAskSchema)
	.output(PlacedSidebarSchema)
	.handle(async (ask, { tabs, placedApps }) => placedSidebarOf(await tabs.placedTabs(), placedApps.placedApps(), ask));

export const HeldTabsQuery = query("held-tabs")
	.public()
	.input(SettleAskSchema)
	.output(HeldTabsSchema)
	.handle(async ({ at }, { tabs, placedApps }) => heldTabsAt(await tabs.placedTabs(), placedApps.placedApps(), at));

export const ClosedTabsQuery = query("closed-tabs")
	.public()
	.output(ClosedTabsSchema)
	.handle(async (_input, { tabs, placedApps }) => ({
		tabs: closedRowsOf(placedApps.placedApps(), (await tabs.placedTabs()).closed),
	}));

export const ChatTabsQuery = query("chat-tabs")
	.public()
	.output(ChatTabsSchema)
	.handle(async (_input, { tabs, placedApps }) => chatTabsOf(await tabs.placedTabs(), placedApps.placedApps()));

export const RereadPlacedTabsSubscriber = subscriber(PlacedTabsChangedEvent).handle((_input, { invalidate }) => {
	invalidate(PlacedTabsQuery);
	invalidate(TabRowsQuery);
	invalidate(SidebarQuery);
	invalidate(HeldTabsQuery);
	invalidate(ClosedTabsQuery);
	invalidate(ChatTabsQuery);
});
