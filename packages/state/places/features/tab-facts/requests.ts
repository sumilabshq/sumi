import { Repeatable, command, deny, guard, query, refuse, subscriber } from "@widgetarium/data-framework";
import { PlacedTabsChangedEvent } from "../../gateways/tabs/tabs.events.js";
import { TabsGateway } from "../../gateways/tabs/tabs.gateway.js";
import { answered, moving } from "../../shared/lib/settling/settling.js";
import { holdsTabs } from "../../shared/lib/tabs/app-abilities.js";
import { canStep } from "../../shared/lib/tabs/tab-history.js";
import { AskedLinkSchema } from "../../shared/schema/tabs.schema.js";
import {
	AppPageSchema,
	AskedLinksAskSchema,
	AskedLinksSchema,
	LinkAskSchema,
	LinkFollowedSchema,
	OwnAppTabAskSchema,
	OwnAppTabSchema,
	KeepChatTabsAskSchema,
	SeenTabSchema,
	TabTurnMarksSchema,
	TabTurnSchema,
	TakeAskedLinkSchema,
} from "../../shared/schema/tab-facts.schema.js";
import { linkRouteOf, navigatedPlan, withLinkAsked, withLinkTaken } from "./lib/link-routes.js";
import {
	forgetRunningTurnsPlan,
	keepChatTabsPlan,
	markSeenPlan,
	recordAppPagePlan,
	recordTurnPlan,
} from "./lib/fact-plans.js";

export const KeepChatTabsCommand = command("keep-chat-tabs")
	.input(KeepChatTabsAskSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ chats }, { tabs }) => {
		answered(await tabs.movePlacedTabs(moving(null, keepChatTabsPlan(chats))));
	});

export const RecordTabTurnCommand = command("record-tab-turn")
	.input(TabTurnSchema)
	.output(TabTurnMarksSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async (turn, { tabs }) => {
		const marks = answered(await tabs.movePlacedTabs(moving(null, recordTurnPlan(turn))));

		if (marks.was === null) {
			console.info(`[widgetarium] turn of ${turn.id} kept nowhere: no open tab holds it`);
		}

		return marks;
	});

export const MarkTabSeenCommand = command("mark-tab-seen")
	.input(SeenTabSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ id }, { tabs }) => {
		answered(await tabs.movePlacedTabs(moving(null, markSeenPlan(id))));
	});

export const ForgetRunningTurnsCommand = command("forget-running-turns")
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async (_input, { tabs }) => {
		answered(await tabs.movePlacedTabs(moving(null, forgetRunningTurnsPlan())));
	});

const APP_CALLABLE: ReadonlySet<string> = new Set([
	"places/open-tab",
	"places/record-app-page",
	"places/app-tab",
	"places/open-link",
]);
const NOT_FOR_APPS = "{request} is not open to apps; an app may call {allowed}";
const NOT_ITS_TAB = "tab {id} does not hold the app {app}";
const NO_TAB = "no open tab {id}";
const LINK_REFUSED = "[widgetarium] link {href} from tab {from} refused: {reason}";

export const AppCallersGuard = guard().handle(({ request, context }) => {
	if (context.user !== null && !APP_CALLABLE.has(request)) {
		deny(NOT_FOR_APPS.replace("{request}", request).replace("{allowed}", [...APP_CALLABLE].join(", ")));
	}
});

export const OwnsAppTabGuard = guard<{ readonly id: string }>()
	.inject({ tabs: TabsGateway })
	.handle(async ({ input, context }, { tabs }) => {
		if (context.user === null) {
			return;
		}

		await denyUnlessAppHolds(tabs, input.id, context.user.id);
	});

export const OwnsLinkingTabGuard = guard<{ readonly from: string }>()
	.inject({ tabs: TabsGateway })
	.handle(async ({ input, context }, { tabs }) => {
		if (context.user === null) {
			return;
		}

		await denyUnlessAppHolds(tabs, input.from, context.user.id);
	});

export const OpenLinkCommand = command("open-link")
	.input(LinkAskSchema)
	.output(LinkFollowedSchema)
	.idempotencyKey(Repeatable)
	.guard(OwnsLinkingTabGuard)
	.inject({ tabs: TabsGateway })
	.handle(async (ask, { tabs }) => {
		const tab = (await tabs.placedTabs()).tabs.find(({ id }) => id === ask.from);

		if (tab === undefined) {
			return refuse(NO_TAB.replace("{id}", ask.from));
		}

		const route = linkRouteOf(tab.app, ask);

		if (route.kind === "refused") {
			console.info(
				LINK_REFUSED.replace("{href}", ask.href).replace("{from}", ask.from).replace("{reason}", route.reason),
			);
			return refuse(route.reason);
		}

		if (route.kind === "navigate") {
			answered(await tabs.movePlacedTabs(moving(null, navigatedPlan(ask.from, route.address))));
			return { kind: "navigated" as const };
		}

		const asked = await tabs.movePlacedTabs((placed) => withLinkAsked(placed, { ...ask, href: route.href }));
		console.info(`[widgetarium] link ${asked.href} from tab ${asked.from} asked as ${asked.id}`);
		return { kind: "asked" as const };
	});

export const AskedLinksQuery = query("asked-links")
	.input(AskedLinksAskSchema)
	.output(AskedLinksSchema)
	.inject({ tabs: TabsGateway })
	.handle(async ({ tabIds }, { tabs }) => {
		const held = new Set(tabIds);
		return {
			links: ((await tabs.placedTabs()).askedLinks ?? []).filter(({ from }) => held.has(from)),
		};
	});

export const TakeAskedLinkCommand = command("take-asked-link")
	.input(TakeAskedLinkSchema)
	.output(AskedLinkSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ id }, { tabs }) => {
		const taken = await tabs.movePlacedTabs((placed) => withLinkTaken(placed, id));
		return typeof taken === "string" ? refuse(taken) : taken;
	});

export const RereadAskedLinksSubscriber = subscriber(PlacedTabsChangedEvent).handle((_input, { invalidate }) => {
	invalidate(AskedLinksQuery);
});

export const AppTabQuery = query("app-tab")
	.input(OwnAppTabAskSchema)
	.output(OwnAppTabSchema)
	.guard(OwnsAppTabGuard)
	.inject({ tabs: TabsGateway })
	.handle(async ({ id }, { tabs }) => {
		const tab = (await tabs.placedTabs()).tabs.find((held) => held.id === id);

		if (tab === undefined) {
			return refuse(NO_TAB.replace("{id}", id));
		}

		return {
			id: tab.id,
			app: tab.app,
			address: tab.lastAddress,
			title: tab.lastTitle ?? tab.title,
			chatId: holdsTabs(tab) ? tab.id : null,
			canGoBack: canStep(tab, "back"),
			canGoForward: canStep(tab, "forward"),
		};
	});

export const RereadAppTabSubscriber = subscriber(PlacedTabsChangedEvent).handle((_input, { invalidate }) => {
	invalidate(AppTabQuery);
});

export const RecordAppPageCommand = command("record-app-page")
	.input(AppPageSchema)
	.idempotencyKey(Repeatable)
	.guard(OwnsAppTabGuard)
	.inject({ tabs: TabsGateway })
	.handle(async (page, { tabs }) => {
		answered(await tabs.movePlacedTabs(moving(null, recordAppPagePlan(page))));
	});

async function denyUnlessAppHolds(tabs: TabsGateway, tabId: string, app: string): Promise<void> {
	const tab = (await tabs.placedTabs()).tabs.find(({ id }) => id === tabId);

	if (tab?.app !== app) {
		deny(NOT_ITS_TAB.replace("{id}", tabId).replace("{app}", app));
	}
}
