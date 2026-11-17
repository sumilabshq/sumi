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
	TabHoldersAskSchema,
	TabHoldersSchema,
} from "../../shared/schema/tab-rows.schema.js";
import { StudioViewSchema, WindowTabsSchema } from "../../shared/schema/tabs.schema.js";
import { WindowLabelSchema } from "../../shared/schema/windows.schema.js";
import { heldTabsAt, placedSidebarOf, rowsAt } from "./lib/tab-reads.js";
import { holdersOf } from "../../shared/lib/tabs/tab-leases.js";

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

export const holders = query()
	.public()
	.input(TabHoldersAskSchema)
	.output(TabHoldersSchema)
	.handle(async ({ ids, window }, { tabs }) => {
		const placed = await tabs.placedTabs();
		const held = holdersOf(placed);
		const listed = new Set(placed.tabs.map((tab) => tab.id));
		return { holders: ids.map((id) => ({ id, window: held.get(id) ?? (listed.has(id) ? window : null) })) };
	});

export const rereadPlaced = subscriber(placedTabsChanged).handle((_input, { invalidate }) => {
	invalidate(placedTabs);
	invalidate(rows);
	invalidate(sidebar);
	invalidate(heldTabs);
	invalidate(shownView);
	invalidate(closedTabs);
	invalidate(holders);
});
