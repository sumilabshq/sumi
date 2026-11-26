import { flowOfId, withFlowChanged, withoutFlow } from "../../../shared/lib/flows/flow-docs.js";
import { tabsMoveAsPlaces } from "../../../shared/lib/flows/flow-moves.js";
import type { MovePlaces, PlacesMove } from "../../../shared/lib/flows/flow-moves.js";
import { flowTabIdsOf, panesOf } from "../../../shared/lib/flows/flow-nodes.js";
import { layoutWithTabReplaced, layoutWithoutTabs } from "../../../shared/lib/flows/flow-panes.js";
import { settlingWith } from "../../../shared/lib/settling/settling.js";
import type { Answer, Settled } from "../../../shared/lib/settling/settling.js";
import type { PlacedApps } from "../../../shared/lib/tabs/app-abilities.js";
import type { FlowsDoc } from "../../../shared/schema/flows.schema.js";
import type { NavigateAsk } from "../../../shared/schema/tab-asks.schema.js";
import { navigatePlan } from "./navigating-plans.js";

type Navigated = PlacesMove<Answer<Settled<string>>>;

interface TabSwap {
	readonly fromId: string;
	readonly toId: string;
}

export function navigateMove(ask: NavigateAsk, apps: PlacedApps): MovePlaces<Answer<Settled<string>>> {
	const navigating = tabsMoveAsPlaces(settlingWith(ask.at, apps, navigatePlan(ask)));
	const fromId = placeGiverOf(ask);
	return (now) => {
		const navigated = navigating(now);

		if (fromId === null || navigated.answer.isRefused || navigated.answer.value.extra === fromId) {
			return navigated;
		}

		return withFlowTabSwapped(navigated, { fromId, toId: navigated.answer.value.extra });
	};
}

function placeGiverOf({ where, from, target }: NavigateAsk): string | null {
	const takesPlace = where === "this-tab" && (target.kind === "app" || target.isMoved);
	return takesPlace ? from : null;
}

function withFlowTabSwapped(navigated: Navigated, swap: TabSwap): Navigated {
	const flows = navigated.next?.flows ?? null;
	const holder = flows?.flows.find((flow) => flowTabIdsOf(flow).includes(swap.fromId));

	if (navigated.next === null || flows === null || holder === undefined) {
		return navigated;
	}

	const freed = withTabLeftFlows(flows, swap.toId);
	const layout = layoutWithTabReplaced(flowOfId(freed, holder.id)?.layout ?? holder.layout, swap.fromId, swap.toId);
	return {
		...navigated,
		next: { tabs: navigated.next.tabs, flows: withFlowChanged(freed, holder.id, { layout }) },
		reason: `${navigated.reason}; flow ${holder.id} puts ${swap.toId} in the place of ${swap.fromId}`,
	};
}

function withTabLeftFlows(doc: FlowsDoc, tabId: string): FlowsDoc {
	const gone = new Set([tabId]);
	return doc.flows
		.filter((flow) => flowTabIdsOf(flow).includes(tabId))
		.reduce((kept, flow) => {
			const layout = layoutWithoutTabs(flow.layout, gone);
			const isEmptied = panesOf(layout.root).every(({ tabIds }) => tabIds.length === 0);
			return isEmptied ? withoutFlow(kept, flow.id) : withFlowChanged(kept, flow.id, { layout });
		}, doc);
}
