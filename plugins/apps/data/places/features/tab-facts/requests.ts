import { Repeatable, deny, guard, refuse } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { PlacedTabsChangedEvent } from "../../gateways/tabs/tabs.events.js";
import { TabsGateway } from "../../gateways/tabs/tabs.gateway.js";
import { answered, moving } from "../../shared/lib/settling/settling.js";
import { AskedLinkSchema } from "../../shared/schema/tabs.schema.js";
import {
	AppAddressSchema,
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
import { ownAppTabOf } from "./lib/own-app-tab.js";
import {
	forgetRunningTurnsPlan,
	keepChatTabsPlan,
	markSeenPlan,
	recordAppAddressPlan,
	recordTurnPlan,
} from "./lib/fact-plans.js";

export const KeepChatTabsCommand = command("keep-chat-tabs")
	.public()
	.input(KeepChatTabsAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ chats }, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(null, placedApps.placedApps(), keepChatTabsPlan(chats))));
	});

export const RecordTabTurnCommand = command("record-tab-turn")
	.public()
	.input(TabTurnSchema)
	.output(TabTurnMarksSchema)
	.idempotencyKey(Repeatable)
	.handle(async (turn, { tabs, placedApps }) => {
		const marks = answered(await tabs.movePlacedTabs(moving(null, placedApps.placedApps(), recordTurnPlan(turn))));

		if (marks.was === null) {
			console.info(`[widgetarium] turn of ${turn.id} kept nowhere: no open tab holds it`);
		}

		return marks;
	});

export const MarkTabSeenCommand = command("mark-tab-seen")
	.public()
	.input(SeenTabSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(null, placedApps.placedApps(), markSeenPlan(id))));
	});

export const ForgetRunningTurnsCommand = command("forget-running-turns")
	.public()
	.idempotencyKey(Repeatable)
	.handle(async (_input, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(null, placedApps.placedApps(), forgetRunningTurnsPlan())));
	});

const APP_CALLABLE: ReadonlySet<string> = new Set([
	"places/open-tab",
	"places/record-app-address",
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
	.requires({ tabs: TabsGateway })
	.handle(async ({ input, context }, { tabs }) => {
		if (context.user === null) {
			return;
		}

		await denyUnlessAppHolds(tabs, input.id, context.user.id);
	});

export const OwnsLinkingTabGuard = guard<{ readonly from: string }>()
	.requires({ tabs: TabsGateway })
	.handle(async ({ input, context }, { tabs }) => {
		if (context.user === null) {
			return;
		}

		await denyUnlessAppHolds(tabs, input.from, context.user.id);
	});

export const OpenLinkCommand = command("open-link")
	.public()
	.input(LinkAskSchema)
	.output(LinkFollowedSchema)
	.idempotencyKey(Repeatable)
	.guard(OwnsLinkingTabGuard)
	.handle(async (ask, { tabs, placedApps }) => {
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
			answered(
				await tabs.movePlacedTabs(moving(null, placedApps.placedApps(), navigatedPlan(ask.from, route.address))),
			);
			return { kind: "navigated" as const };
		}

		const asked = await tabs.movePlacedTabs((placed) => withLinkAsked(placed, { ...ask, href: route.href }));
		console.info(`[widgetarium] link ${asked.href} from tab ${asked.from} asked as ${asked.id}`);
		return { kind: "asked" as const };
	});

export const AskedLinksQuery = query("asked-links")
	.public()
	.input(AskedLinksAskSchema)
	.output(AskedLinksSchema)
	.handle(async ({ tabIds }, { tabs }) => {
		const held = new Set(tabIds);
		return {
			links: ((await tabs.placedTabs()).askedLinks ?? []).filter(({ from }) => held.has(from)),
		};
	});

export const TakeAskedLinkCommand = command("take-asked-link")
	.public()
	.input(TakeAskedLinkSchema)
	.output(AskedLinkSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { tabs }) => {
		const taken = await tabs.movePlacedTabs((placed) => withLinkTaken(placed, id));
		return typeof taken === "string" ? refuse(taken) : taken;
	});

export const RereadAskedLinksSubscriber = subscriber(PlacedTabsChangedEvent).handle((_input, { invalidate }) => {
	invalidate(AskedLinksQuery);
});

export const AppTabQuery = query("app-tab")
	.public()
	.input(OwnAppTabAskSchema)
	.output(OwnAppTabSchema)
	.guard(OwnsAppTabGuard)
	.handle(async ({ id }, { tabs, placedApps }) => {
		const placed = await tabs.placedTabs();
		const tab = placed.tabs.find((held) => held.id === id);
		return tab === undefined ? refuse(NO_TAB.replace("{id}", id)) : ownAppTabOf(placedApps.placedApps(), tab);
	});

export const RereadAppTabSubscriber = subscriber(PlacedTabsChangedEvent).handle((_input, { invalidate }) => {
	invalidate(AppTabQuery);
});

export const RecordAppAddressCommand = command("record-app-address")
	.public()
	.input(AppAddressSchema)
	.idempotencyKey(Repeatable)
	.guard(OwnsAppTabGuard)
	.handle(async (page, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(null, placedApps.placedApps(), recordAppAddressPlan(page))));
	});

async function denyUnlessAppHolds(tabs: TabsGateway, tabId: string, app: string): Promise<void> {
	const tab = (await tabs.placedTabs()).tabs.find(({ id }) => id === tabId);

	if (tab?.app !== app) {
		deny(NOT_ITS_TAB.replace("{id}", tabId).replace("{app}", app));
	}
}
