import { query, subscriber } from "@widgetarium/framework";
import { PlacedTabsChangedEvent } from "../../gateways/tabs/tabs.events.js";
import { TabsGateway } from "../../gateways/tabs/tabs.gateway.js";
import { closedRowsOf } from "../../shared/lib/rows/closed-rows.js";
import { appFacesOf } from "../../shared/lib/rows/tab-face.js";
import { momentOfWindow, windowTabsOf } from "../../shared/lib/tabs/kept-tabs.js";
import { SettleAskSchema } from "../../shared/schema/tab-asks.schema.js";
import {
	AppFacesSchema,
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
	.input(WindowLabelSchema)
	.output(WindowTabsSchema)
	.inject({ tabs: TabsGateway })
	.handle(async ({ window }, { tabs }) => windowTabsOf(momentOfWindow(await tabs.placedTabs(), window)));

export const TabRowsQuery = query("tab-rows")
	.input(SettleAskSchema)
	.output(AppTabsSchema)
	.inject({ tabs: TabsGateway })
	.handle(async ({ at }, { tabs }) => rowsAt(await tabs.placedTabs(), at));

export const SidebarQuery = query("sidebar")
	.input(SidebarAskSchema)
	.output(PlacedSidebarSchema)
	.inject({ tabs: TabsGateway })
	.handle(async (ask, { tabs }) => placedSidebarOf(await tabs.placedTabs(), ask));

export const HeldTabsQuery = query("held-tabs")
	.input(SettleAskSchema)
	.output(HeldTabsSchema)
	.inject({ tabs: TabsGateway })
	.handle(async ({ at }, { tabs }) => heldTabsAt(await tabs.placedTabs(), at));

export const ClosedTabsQuery = query("closed-tabs")
	.output(ClosedTabsSchema)
	.inject({ tabs: TabsGateway })
	.handle(async (_input, { tabs }) => ({ tabs: closedRowsOf((await tabs.placedTabs()).closed) }));

export const AppFacesQuery = query("app-faces")
	.output(AppFacesSchema)
	.settlesNow()
	.handle(() => ({ faces: appFacesOf() }));

export const ChatTabsQuery = query("chat-tabs")
	.output(ChatTabsSchema)
	.inject({ tabs: TabsGateway })
	.handle(async (_input, { tabs }) => chatTabsOf(await tabs.placedTabs()));

export const RereadPlacedTabsSubscriber = subscriber(PlacedTabsChangedEvent).handle((_input, { invalidate }) => {
	invalidate(PlacedTabsQuery);
	invalidate(TabRowsQuery);
	invalidate(SidebarQuery);
	invalidate(HeldTabsQuery);
	invalidate(ClosedTabsQuery);
	invalidate(ChatTabsQuery);
});
