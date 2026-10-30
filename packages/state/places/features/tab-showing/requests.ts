import { Repeatable, command } from "@widgetarium/core/requests";
import { TabsGateway } from "../../gateways/tabs/tabs.gateway.js";
import { settledOf, settling } from "../../shared/lib/settling/settling.js";
import { TabsSettledSchema } from "../../shared/schema/screen.schema.js";
import {
	ChatTabAskSchema,
	RestoreTabsAskSchema,
	SettleAskSchema,
	TabAskSchema,
} from "../../shared/schema/tab-asks.schema.js";
import {
	fitTabsPlan,
	ownWindowPlan,
	reloadPlan,
	rememberPagesPlan,
	restorePlan,
	showChatTabPlan,
	showTabPlan,
	tearOffPlan,
} from "./lib/showing-plans.js";

export const RestoreTabsCommand = command("restore-tabs")
	.input(RestoreTabsAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ at, ...ask }, { tabs }) => settledOf(await tabs.movePlacedTabs(settling(at, restorePlan(ask)))));

export const ShowTabCommand = command("show-tab")
	.input(TabAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ at, id }, { tabs }) => settledOf(await tabs.movePlacedTabs(settling(at, showTabPlan(id)))));

export const ShowChatTabCommand = command("show-chat-tab")
	.input(ChatTabAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ at, chatId }, { tabs }) =>
		settledOf(await tabs.movePlacedTabs(settling(at, showChatTabPlan(chatId)))),
	);

export const FitTabsToPanesCommand = command("fit-tabs-to-panes")
	.input(SettleAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ at }, { tabs }) => settledOf(await tabs.movePlacedTabs(settling(at, fitTabsPlan()))));

export const RememberPagesCommand = command("remember-pages")
	.input(SettleAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ at }, { tabs }) => settledOf(await tabs.movePlacedTabs(settling(at, rememberPagesPlan()))));

export const OpenTabInOwnWindowCommand = command("open-tab-in-own-window")
	.input(TabAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ at, id }, { tabs }) => settledOf(await tabs.movePlacedTabs(settling(at, ownWindowPlan(id)))));

export const TearOffTabCommand = command("tear-off-tab")
	.input(TabAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ at, id }, { tabs }) => settledOf(await tabs.movePlacedTabs(settling(at, tearOffPlan(id)))));

export const ReloadTabCommand = command("reload-tab")
	.input(TabAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ at, id }, { tabs }) => settledOf(await tabs.movePlacedTabs(settling(at, reloadPlan(id)))));
