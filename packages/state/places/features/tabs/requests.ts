import { query, subscriber } from "#module";
import { PlacedTabsChangedEvent } from "../../gateways/tabs/tabs.events.js";
import { closedRowsOf } from "../../shared/lib/rows/closed-rows.js";
import { appFacesOf } from "../../shared/lib/rows/tab-face.js";
import { momentOfWindow, windowTabsOf } from "../../shared/lib/tabs/kept-tabs.js";
import { SettleAskSchema } from "../../shared/schema/tab-asks.schema.js";
import { AppFacesSchema, AppTabsSchema, ClosedTabsSchema, HeldTabsSchema, PlacedSidebarSchema, SidebarAskSchema } from "../../shared/schema/tab-rows.schema.js";
import { ChatTabsSchema, WindowTabsSchema } from "../../shared/schema/tabs.schema.js";
import { WindowLabelSchema } from "../../shared/schema/windows.schema.js";
import { chatTabsOf, heldTabsAt, placedSidebarOf, rowsAt } from "./lib/tab-reads.js";

export const PlacedTabsQuery = query("placed-tabs")
	.public()
	.input(WindowLabelSchema)
	.output(WindowTabsSchema)
	.handle(async ({ window }, { tabs }) => windowTabsOf(momentOfWindow(await tabs.placedTabs(), window)));

export const TabRowsQuery = query("tab-rows")
	.public()
	.input(SettleAskSchema)
	.output(AppTabsSchema)
	.handle(async ({ at }, { tabs }) => rowsAt(await tabs.placedTabs(), at));

export const SidebarQuery = query("sidebar")
	.public()
	.input(SidebarAskSchema)
	.output(PlacedSidebarSchema)
	.handle(async (ask, { tabs }) => placedSidebarOf(await tabs.placedTabs(), ask));

export const HeldTabsQuery = query("held-tabs")
	.public()
	.input(SettleAskSchema)
	.output(HeldTabsSchema)
	.handle(async ({ at }, { tabs }) => heldTabsAt(await tabs.placedTabs(), at));

export const ClosedTabsQuery = query("closed-tabs")
	.public()
	.output(ClosedTabsSchema)
	.handle(async (_input, { tabs }) => ({ tabs: closedRowsOf((await tabs.placedTabs()).closed) }));

export const AppFacesQuery = query("app-faces")
	.public()
	.output(AppFacesSchema)
	.settlesNow()
	.handle(() => ({ faces: appFacesOf() }));

export const ChatTabsQuery = query("chat-tabs")
	.public()
	.output(ChatTabsSchema)
	.handle(async (_input, { tabs }) => chatTabsOf(await tabs.placedTabs()));

export const RereadPlacedTabsSubscriber = subscriber(PlacedTabsChangedEvent).handle((_input, { invalidate }) => {
	invalidate(PlacedTabsQuery);
	invalidate(TabRowsQuery);
	invalidate(SidebarQuery);
	invalidate(HeldTabsQuery);
	invalidate(ClosedTabsQuery);
	invalidate(ChatTabsQuery);
});
