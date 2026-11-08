import { Repeatable } from "@widgetarium/data-framework";
import { command } from "#module";
import { answered, moving, settledOf, settling } from "../../shared/lib/settling/settling.js";
import { TabsSettledSchema } from "../../shared/schema/screen.schema.js";
import {
	RestoreTabsAskSchema,
	SettleAskSchema,
	ShowTabAskSchema,
	ShowViewAskSchema,
	TabAskSchema,
} from "../../shared/schema/tab-asks.schema.js";
import {
	fitTabsPlan,
	ownWindowPlan,
	reloadPlan,
	rememberPagesPlan,
	restorePlan,
	showTabPlan,
	showViewPlan,
	tearOffPlan,
} from "./lib/showing-plans.js";

export const RestoreTabsCommand = command("restore-tabs")
	.public()
	.input(RestoreTabsAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, ...ask }, { tabs, placedApps }) =>
		settledOf(await tabs.movePlacedTabs(settling(at, placedApps.placedApps(), restorePlan(ask)))),
	);

export const ShowTabCommand = command("show-tab")
	.public()
	.input(ShowTabAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, ...asked }, { tabs, placedApps }) =>
		settledOf(await tabs.movePlacedTabs(settling(at, placedApps.placedApps(), showTabPlan(asked)))),
	);

export const FitTabsToPanesCommand = command("fit-tabs-to-panes")
	.public()
	.input(SettleAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at }, { tabs, placedApps }) =>
		settledOf(await tabs.movePlacedTabs(settling(at, placedApps.placedApps(), fitTabsPlan()))),
	);

export const RememberPagesCommand = command("remember-pages")
	.public()
	.input(SettleAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at }, { tabs, placedApps }) =>
		settledOf(await tabs.movePlacedTabs(settling(at, placedApps.placedApps(), rememberPagesPlan()))),
	);

export const OpenTabInOwnWindowCommand = command("open-tab-in-own-window")
	.public()
	.input(TabAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, id }, { tabs, placedApps }) =>
		settledOf(await tabs.movePlacedTabs(settling(at, placedApps.placedApps(), ownWindowPlan(id)))),
	);

export const TearOffTabCommand = command("tear-off-tab")
	.public()
	.input(TabAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, id }, { tabs, placedApps }) =>
		settledOf(await tabs.movePlacedTabs(settling(at, placedApps.placedApps(), tearOffPlan(id)))),
	);

export const ReloadTabCommand = command("reload-tab")
	.public()
	.input(TabAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, id }, { tabs, placedApps }) =>
		settledOf(await tabs.movePlacedTabs(settling(at, placedApps.placedApps(), reloadPlan(id)))),
	);

export const ShowViewCommand = command("show-view")
	.public()
	.input(ShowViewAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window, view }, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(window, placedApps.placedApps(), showViewPlan(view))));
	});
