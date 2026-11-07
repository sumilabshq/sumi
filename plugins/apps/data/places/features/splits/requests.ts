import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { PlacedTabsChangedEvent } from "../../gateways/tabs/tabs.events.js";
import { answered, settledOf, settlingWith } from "../../shared/lib/settling/settling.js";
import { momentOfWindow } from "../../shared/lib/tabs/kept-tabs.js";
import { shownSplitOf } from "../../shared/lib/splits/split-members.js";
import { TabsSettledSchema } from "../../shared/schema/screen.schema.js";
import {
	LeftSplitSchema,
	PlaceInViewAskSchema,
	PlacedInViewSchema,
	ReorderSplitMemberAskSchema,
	ResizeSplitAskSchema,
	ShownSplitSchema,
	SplitMemberAskSchema,
} from "../../shared/schema/split-asks.schema.js";
import { WindowLabelSchema } from "../../shared/schema/windows.schema.js";
import { placeInViewPlan, removeFromSplitPlan, reorderSplitMemberPlan, resizeSplitPlan } from "./lib/split-plans.js";

export const ShownSplitQuery = query("shown-split")
	.public()
	.input(WindowLabelSchema)
	.output(ShownSplitSchema)
	.handle(async ({ window }, { tabs, placedApps }) => {
		const moment = momentOfWindow(await tabs.placedTabs(), window, placedApps.placedApps());
		return {
			shownId: moment.shownId,
			split: shownSplitOf(moment),
		};
	});

export const PlaceInViewCommand = command("place-in-view")
	.public()
	.input(PlaceInViewAskSchema)
	.output(PlacedInViewSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, ...placing }, { tabs, placedApps }) => {
		const { view, effects, extra } = answered(
			await tabs.movePlacedTabs(settlingWith(at, placedApps.placedApps(), placeInViewPlan(placing))),
		);
		return {
			view,
			effects,
			isPlaced: extra,
		};
	});

export const RemoveFromSplitCommand = command("remove-from-split")
	.public()
	.input(SplitMemberAskSchema)
	.output(LeftSplitSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, tabId }, { tabs, placedApps }) => {
		const { view, effects, extra } = answered(
			await tabs.movePlacedTabs(settlingWith(at, placedApps.placedApps(), removeFromSplitPlan(tabId))),
		);
		return {
			view,
			effects,
			isMember: extra,
		};
	});

export const ReorderSplitMemberCommand = command("reorder-split-member")
	.public()
	.input(ReorderSplitMemberAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, tabId, before }, { tabs, placedApps }) =>
		settledOf(
			await tabs.movePlacedTabs(settlingWith(at, placedApps.placedApps(), reorderSplitMemberPlan(tabId, before))),
		),
	);

export const ResizeSplitCommand = command("resize-split")
	.public()
	.input(ResizeSplitAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, branchId, edge, share }, { tabs, placedApps }) =>
		settledOf(
			await tabs.movePlacedTabs(
				settlingWith(at, placedApps.placedApps(), resizeSplitPlan({ branchId, at: edge, share })),
			),
		),
	);

export const RereadShownSplitSubscriber = subscriber(PlacedTabsChangedEvent).handle((_input, { invalidate }) => {
	invalidate(ShownSplitQuery);
});
