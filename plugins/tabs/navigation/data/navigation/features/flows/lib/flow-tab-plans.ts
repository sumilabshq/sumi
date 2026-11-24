import { flowOfId, withFlowChanged } from "../../../shared/lib/flows/flow-docs.js";
import { flowsMove, tabsMoveAsPlaces } from "../../../shared/lib/flows/flow-moves.js";
import type { MovePlaces } from "../../../shared/lib/flows/flow-moves.js";
import { panesOf } from "../../../shared/lib/flows/flow-nodes.js";
import { layoutWithTab } from "../../../shared/lib/flows/flow-panes.js";
import { flowHolderOf } from "../../../shared/lib/flows/flow-rows.js";
import { refusal, settlingWith } from "../../../shared/lib/settling/settling.js";
import type { Answer, Settled } from "../../../shared/lib/settling/settling.js";
import { openPlan } from "../../../shared/lib/showing/opening-plans.js";
import type { PlacedApps } from "../../../shared/lib/tabs/app-abilities.js";
import type { OpenFlowTabAskSchema } from "../../../shared/schema/flow-asks.schema.js";
import type { Flow } from "../../../shared/schema/flows.schema.js";
import type { z } from "zod";

type OpenFlowTabAsk = z.infer<typeof OpenFlowTabAskSchema>;
type OpenedFlowTab = ReturnType<MovePlaces<Answer<Settled<string>>>>;

const NO_FLOW = 'no flow "{id}" stands here';
const NO_PANE = 'the flow holds no pane "{id}"';
const HELD_ELSEWHERE = 'the flow "{id}" is open in window {window}: only that window changes its panes';

export function openFlowTabMove(ask: OpenFlowTabAsk, apps: PlacedApps): MovePlaces<Answer<Settled<string>>> {
	const guarding = guardOf(ask);
	const opening = tabsMoveAsPlaces(settlingWith(ask.at, apps, openPlan(unshownTabOf(ask))));
	return (now) => {
		const guarded = guarding(now);

		if (guarded.answer.isRefused) {
			return { next: null, reason: guarded.reason, answer: { isRefused: true, reason: guarded.answer.reason } };
		}

		const opened = opening(now);
		const flow = now.flows === null ? undefined : flowOfId(now.flows, ask.flowId);
		return flow === undefined ? opened : withTabInPane(opened, { ask, flow });
	};
}

function unshownTabOf({ app, address }: OpenFlowTabAsk): Parameters<typeof openPlan>[0] {
	return { app, address: address ?? "", list: null, groupId: null, show: false, reusesHeld: false };
}

function guardOf(ask: OpenFlowTabAsk): MovePlaces<Answer<null>> {
	return flowsMove(({ tabs, flows }) => {
		const flow = flowOfId(flows, ask.flowId);

		if (flow === undefined) {
			return refusal(NO_FLOW.replace("{id}", ask.flowId));
		}

		const holder = flowHolderOf(tabs, flows, ask);

		if (holder !== null) {
			return refusal(HELD_ELSEWHERE.replace("{id}", ask.flowId).replace("{window}", holder));
		}

		return panesOf(flow.layout.root).some(({ id }) => id === ask.paneId)
			? { flows, reason: `flow ${ask.flowId} may open a tab in ${ask.paneId}`, value: null }
			: refusal(NO_PANE.replace("{id}", ask.paneId));
	});
}

interface PaneOfFlow {
	readonly ask: OpenFlowTabAsk;
	readonly flow: Flow;
}

function withTabInPane(opened: OpenedFlowTab, { ask, flow }: PaneOfFlow): OpenedFlowTab {
	if (opened.answer.isRefused || opened.next === null || opened.next.flows === null) {
		return opened;
	}

	const tabId = opened.answer.value.extra;
	const layout = { ...layoutWithTab(flow.layout, tabId, ask.paneId), focusedPaneId: ask.paneId };
	return {
		next: { tabs: opened.next.tabs, flows: withFlowChanged(opened.next.flows, ask.flowId, { layout }) },
		reason: `${opened.reason}; flow ${ask.flowId} pane ${ask.paneId} gains ${tabId}`,
		answer: opened.answer,
	};
}
