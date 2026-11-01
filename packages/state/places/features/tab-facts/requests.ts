import { Repeatable, command, deny, guard, query, refuse, subscriber } from "@widgetarium/core/requests";
import { PlacedTabsChangedEvent } from "../../gateways/tabs/tabs.events.js";
import { TabsGateway } from "../../gateways/tabs/tabs.gateway.js";
import { answered, moving } from "../../shared/lib/settling/settling.js";
import { holdsTabs } from "../../shared/lib/tabs/app-abilities.js";
import {
	AppPageSchema,
	OwnAppTabAskSchema,
	OwnAppTabSchema,
	KeepChatTabsAskSchema,
	SeenTabSchema,
	TabTurnMarksSchema,
	TabTurnSchema,
} from "../../shared/schema/tab-facts.schema.js";
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

const APP_CALLABLE: ReadonlySet<string> = new Set(["places/open-tab", "places/record-app-page", "places/app-tab"]);
const NOT_FOR_APPS = "{request} is not open to apps; an app may call {allowed}";
const NOT_ITS_TAB = "tab {id} does not hold the app {app}";
const NO_TAB = "no open tab {id}";

export const AppCallersGuard = guard().handle(({ request, context }) => {
	if (context.user !== null && !APP_CALLABLE.has(request)) {
		deny(NOT_FOR_APPS.replace("{request}", request).replace("{allowed}", [...APP_CALLABLE].join(", ")));
	}
});

export const OwnsAppTabGuard = guard<{ readonly id: string }>()
	.inject({ tabs: TabsGateway })
	.handle(async ({ input, context }, { tabs }) => {
		const { user } = context;

		if (user === null) {
			return;
		}

		const tab = (await tabs.placedTabs()).tabs.find(({ id }) => id === input.id);

		if (tab?.app !== user.id) {
			deny(NOT_ITS_TAB.replace("{id}", input.id).replace("{app}", user.id));
		}
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
			address: holdsTabs(tab) ? tab.id : tab.lastAddress,
			title: tab.lastTitle ?? tab.title,
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
