import { Repeatable, command, query, subscriber } from "@widgetarium/core/requests";
import { PlacedTabsChangedEvent } from "../../gateways/tabs/tabs.events.js";
import { TabsGateway } from "../../gateways/tabs/tabs.gateway.js";
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
	.input(WindowLabelSchema)
	.output(ShownSplitSchema)
	.inject({ tabs: TabsGateway })
	.handle(async ({ window }, { tabs }) => {
		const moment = momentOfWindow(await tabs.placedTabs(), window);
		return {
			shownId: moment.shownId,
			split: shownSplitOf(moment),
		};
	});

export const PlaceInViewCommand = command("place-in-view")
	.input(PlaceInViewAskSchema)
	.output(PlacedInViewSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ at, ...placing }, { tabs }) => {
		const { view, effects, extra } = answered(await tabs.movePlacedTabs(settlingWith(at, placeInViewPlan(placing))));
		return {
			view,
			effects,
			isPlaced: extra,
		};
	});

export const RemoveFromSplitCommand = command("remove-from-split")
	.input(SplitMemberAskSchema)
	.output(LeftSplitSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ at, tabId }, { tabs }) => {
		const { view, effects, extra } = answered(await tabs.movePlacedTabs(settlingWith(at, removeFromSplitPlan(tabId))));
		return {
			view,
			effects,
			isMember: extra,
		};
	});

export const ReorderSplitMemberCommand = command("reorder-split-member")
	.input(ReorderSplitMemberAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ at, tabId, before }, { tabs }) =>
		settledOf(await tabs.movePlacedTabs(settlingWith(at, reorderSplitMemberPlan(tabId, before)))),
	);

export const ResizeSplitCommand = command("resize-split")
	.input(ResizeSplitAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ at, branchId, edge, share }, { tabs }) =>
		settledOf(await tabs.movePlacedTabs(settlingWith(at, resizeSplitPlan({ branchId, at: edge, share })))),
	);

export const RereadShownSplitSubscriber = subscriber(PlacedTabsChangedEvent).handle((_input, { invalidate }) => {
	invalidate(ShownSplitQuery);
});
