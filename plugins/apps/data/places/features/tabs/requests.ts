import { query, subscriber } from "#module";
import { placedTabsChanged } from "../../gateways/tabs/tabs.events.js";
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
import { ChatTabsSchema, StudioViewSchema, WindowTabsSchema } from "../../shared/schema/tabs.schema.js";
import { WindowLabelSchema } from "../../shared/schema/windows.schema.js";
import { chatTabsOf, heldTabsAt, placedSidebarOf, rowsAt } from "./lib/tab-reads.js";

export const placedTabs = query()
	.public()
	.input(WindowLabelSchema)
	.output(WindowTabsSchema)
	.handle(async ({ window }, { tabs, placedApps }) =>
		windowTabsOf(momentOfWindow(await tabs.placedTabs(), window, placedApps.placedApps())),
	);

export const rows = query()
	.public()
	.input(SettleAskSchema)
	.output(AppTabsSchema)
	.handle(async ({ at }, { tabs, placedApps }) => rowsAt(await tabs.placedTabs(), placedApps.placedApps(), at));

export const sidebar = query()
	.public()
	.input(SidebarAskSchema)
	.output(PlacedSidebarSchema)
	.handle(async (ask, { tabs, placedApps }) => placedSidebarOf(await tabs.placedTabs(), placedApps.placedApps(), ask));

export const heldTabs = query()
	.public()
	.input(SettleAskSchema)
	.output(HeldTabsSchema)
	.handle(async ({ at }, { tabs, placedApps }) => heldTabsAt(await tabs.placedTabs(), placedApps.placedApps(), at));

export const shownView = query()
	.public()
	.input(WindowLabelSchema)
	.output(StudioViewSchema)
	.handle(
		async ({ window }, { tabs, placedApps }) =>
			momentOfWindow(await tabs.placedTabs(), window, placedApps.placedApps()).view,
	);

export const closedTabs = query()
	.public()
	.output(ClosedTabsSchema)
	.handle(async (_input, { tabs, placedApps }) => ({
		tabs: closedRowsOf(placedApps.placedApps(), (await tabs.placedTabs()).closed),
	}));

export const chatTabs = query()
	.public()
	.output(ChatTabsSchema)
	.handle(async (_input, { tabs, placedApps }) => chatTabsOf(await tabs.placedTabs(), placedApps.placedApps()));

export const rereadPlaced = subscriber(placedTabsChanged).handle((_input, { invalidate }) => {
	invalidate(placedTabs);
	invalidate(rows);
	invalidate(sidebar);
	invalidate(heldTabs);
	invalidate(shownView);
	invalidate(closedTabs);
	invalidate(chatTabs);
});
