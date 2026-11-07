import { Repeatable } from "@widgetarium/data-framework";
import { command } from "#module";
import { answered, settledOf, settling, settlingWith } from "../../shared/lib/settling/settling.js";
import type { Answer, Settled } from "../../shared/lib/settling/settling.js";
import { OpenedTabSettledSchema, TabsSettledSchema } from "../../shared/schema/screen.schema.js";
import type { TabsSettled } from "../../shared/schema/screen.schema.js";
import {
	DuplicateTabAskSchema,
	OpenTabAskSchema,
	ReleaseEssentialAskSchema,
	ReopenClosedAskSchema,
	ShowEssentialAskSchema,
	TabAskSchema,
} from "../../shared/schema/tab-asks.schema.js";
import {
	duplicatePlan,
	openBelowPlan,
	openPlan,
	releaseEssentialPlan,
	reopenPlan,
	showEssentialPlan,
} from "./lib/opening-plans.js";

export const OpenTabCommand = command("open-tab")
	.public()
	.input(OpenTabAskSchema)
	.output(OpenedTabSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, ...ask }, { tabs }) => openedOf(await tabs.movePlacedTabs(settlingWith(at, openPlan(ask)))));

export const OpenTabBelowCommand = command("open-tab-below")
	.public()
	.input(TabAskSchema)
	.output(OpenedTabSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, id }, { tabs }) => openedOf(await tabs.movePlacedTabs(settlingWith(at, openBelowPlan(id)))));

export const DuplicateTabCommand = command("duplicate-tab")
	.public()
	.input(DuplicateTabAskSchema)
	.output(OpenedTabSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, ...ask }, { tabs }) =>
		openedOf(await tabs.movePlacedTabs(settlingWith(at, duplicatePlan(ask)))),
	);

export const ReopenClosedTabCommand = command("reopen-closed-tab")
	.public()
	.input(ReopenClosedAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, tabId }, { tabs }) => settledOf(await tabs.movePlacedTabs(settling(at, reopenPlan(tabId)))));

export const ShowEssentialTabCommand = command("show-essential-tab")
	.public()
	.input(ShowEssentialAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, essential }, { tabs }) =>
		settledOf(await tabs.movePlacedTabs(settling(at, showEssentialPlan(essential)))),
	);

export const ReleaseEssentialTabCommand = command("release-essential-tab")
	.public()
	.input(ReleaseEssentialAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, essential, place }, { tabs }) =>
		settledOf(await tabs.movePlacedTabs(settling(at, releaseEssentialPlan(essential, place)))),
	);

function openedOf(answer: Answer<Settled<string>>): TabsSettled & { readonly id: string } {
	const { view, effects, extra } = answered(answer);
	return {
		id: extra,
		view,
		effects,
	};
}
