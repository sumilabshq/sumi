import { Repeatable } from "@widgetarium/data-framework";
import { command } from "#module";
import { answered, settledOf, settling, settlingWith } from "../../shared/lib/settling/settling.js";
import type { Answer, Settled } from "../../shared/lib/settling/settling.js";
import { OnceOpenedSchema, OpenedTabSettledSchema, TabsSettledSchema } from "../../shared/schema/screen.schema.js";
import type { TabsSettled } from "../../shared/schema/screen.schema.js";
import {
	DuplicateTabAskSchema,
	NavigateAskSchema,
	OpenOnceAskSchema,
	OpenTabAskSchema,
	ReopenClosedAskSchema,
	TabAskSchema,
} from "../../shared/schema/tab-asks.schema.js";
import { duplicatePlan, openBelowPlan, openPlan, reopenPlan } from "../../shared/lib/showing/opening-plans.js";
import { resolvedAppOf } from "../../shared/lib/tabs/app-abilities.js";
import { navigateMove } from "./lib/navigating-moves.js";
import { openedOnce } from "./lib/once-plans.js";

export const openTab = command()
	.public()
	.input(OpenTabAskSchema)
	.output(OpenedTabSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, ...ask }, { tabs, placedApps }) => {
		const apps = placedApps.placedApps();
		return openedOf(
			await tabs.movePlacedTabs(
				settlingWith(at, apps, openPlan({ ...ask, app: resolvedAppOf(apps, ask.app, ask.address) })),
			),
		);
	});

export const navigate = command()
	.public()
	.input(NavigateAskSchema)
	.output(OpenedTabSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs, placedApps }) =>
		openedOf(await tabs.movePlaces(navigateMove(ask, placedApps.placedApps()))),
	);

export const openOnce = command()
	.public()
	.input(OpenOnceAskSchema)
	.output(OnceOpenedSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, ...ask }, { tabs, placedApps }) =>
		answered(await tabs.movePlacedTabs(openedOnce({ at, apps: placedApps.placedApps() }, ask))),
	);

export const openBelow = command()
	.public()
	.input(TabAskSchema)
	.output(OpenedTabSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, id }, { tabs, placedApps }) =>
		openedOf(await tabs.movePlacedTabs(settlingWith(at, placedApps.placedApps(), openBelowPlan(id)))),
	);

export const duplicate = command()
	.public()
	.input(DuplicateTabAskSchema)
	.output(OpenedTabSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, ...ask }, { tabs, placedApps }) =>
		openedOf(await tabs.movePlacedTabs(settlingWith(at, placedApps.placedApps(), duplicatePlan(ask)))),
	);

export const reopenClosed = command()
	.public()
	.input(ReopenClosedAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, tabId }, { tabs, placedApps }) =>
		settledOf(await tabs.movePlacedTabs(settling(at, placedApps.placedApps(), reopenPlan(tabId)))),
	);

function openedOf(answer: Answer<Settled<string>>): TabsSettled & { readonly id: string } {
	const { effects, extra } = answered(answer);
	return {
		id: extra,
		effects,
	};
}
