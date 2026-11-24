import { labelOfPlacesWindow } from "@widgetarium/behaviors";
import { flowOfId, isArchived, withFlowChanged } from "../../../shared/lib/flows/flow-docs.js";
import { READ_ON_OPEN, marksCleared, marksSaid } from "../../../shared/lib/flows/flow-marks.js";
import { chatTabsOf, flowHolderOf } from "../../../shared/lib/flows/flow-rows.js";
import { refusal } from "../../../shared/lib/settling/settling.js";
import { flowsMove, tabsMoveAsPlaces } from "../../../shared/lib/flows/flow-moves.js";
import type { FlowsPlan, MovePlaces } from "../../../shared/lib/flows/flow-moves.js";
import { flowTabIdsOf } from "../../../shared/lib/flows/flow-nodes.js";
import { settling } from "../../../shared/lib/settling/settling.js";
import type { Answer, ShowingPlan } from "../../../shared/lib/settling/settling.js";
import { withPageEnsured } from "../../../shared/lib/showing/showing.js";
import type { PlacedApps } from "../../../shared/lib/tabs/app-abilities.js";
import type { OpenFlowAskSchema } from "../../../shared/schema/flow-asks.schema.js";
import type { TabsSettled } from "../../../shared/schema/screen.schema.js";
import type { z } from "zod";

type OpenFlowAsk = z.infer<typeof OpenFlowAskSchema>;

export interface OpeningMoment {
	readonly apps: PlacedApps;
	readonly at: number;
}

const NO_FLOW = 'no flow "{id}" stands here';
const ARCHIVED = 'the flow "{id}" is archived: unarchive it to open it';
const NO_EFFECTS: TabsSettled = { effects: [] };

export interface FlowOpening {
	readonly window: string;
	readonly at: OpenFlowAsk["at"];
	readonly apps: PlacedApps;
}

export function openFlowMove(ask: OpenFlowAsk, apps: PlacedApps): MovePlaces<Answer<TabsSettled>> {
	return withFlowPagesEnsured(flowsMove(openFlowPlan(ask, { apps, at: Date.now() })), {
		window: ask.window,
		at: ask.at,
		apps,
	});
}

export function withFlowPagesEnsured(
	opening: MovePlaces<Answer<TabsSettled>>,
	{ window, at, apps }: FlowOpening,
): MovePlaces<Answer<TabsSettled>> {
	return (now) => {
		const opened = opening(now);

		if (opened.next === null || opened.next.flows === null || opened.answer.isRefused) {
			return opened;
		}

		const flowId = opened.next.flows.windowFlows[window];
		const flow = flowId === undefined ? undefined : flowOfId(opened.next.flows, flowId);
		const pages = tabsMoveAsPlaces(settling(at, apps, pagesEnsuredPlan(flow === undefined ? [] : flowTabIdsOf(flow))))(
			opened.next,
		);

		if (pages.answer.isRefused) {
			return opened;
		}

		return {
			next: pages.next ?? opened.next,
			reason: `${opened.reason}; ${pages.reason}`,
			answer: pages.answer,
		};
	};
}

export function openFlowPlan(ask: OpenFlowAsk, { apps, at }: OpeningMoment): FlowsPlan<TabsSettled> {
	return ({ tabs, flows }) => {
		const flow = flowOfId(flows, ask.flowId);

		if (flow === undefined) {
			return refusal(NO_FLOW.replace("{id}", ask.flowId));
		}

		if (isArchived(flow)) {
			return refusal(ARCHIVED.replace("{id}", ask.flowId));
		}

		const holder = flowHolderOf(tabs, flows, ask);

		if (holder !== null) {
			return {
				flows,
				reason: `window ${ask.window} flow stays: ${ask.flowId} is held by ${holder}`,
				value: { effects: [{ kind: "focus-window", window: labelOfPlacesWindow(holder) }] },
			};
		}

		const read = marksCleared(
			tabs,
			new Set(chatTabsOf(flow, { placed: tabs, apps }).map(({ id }) => id)),
			READ_ON_OPEN,
		);
		const was = flows.windowFlows[ask.window] ?? "none";
		const opened = withFlowChanged(
			{ ...flows, windowFlows: { ...flows.windowFlows, [ask.window]: ask.flowId } },
			ask.flowId,
			{ lastOpenedAt: at },
		);
		return {
			tabs: read.placed,
			flows: opened,
			reason: `window ${ask.window} flow ${was} → ${ask.flowId}, read: ${marksSaid(read.changes)}`,
			value: NO_EFFECTS,
		};
	};
}

function pagesEnsuredPlan(tabIds: readonly string[]): ShowingPlan {
	return (showing, facts) => {
		const held = new Set(showing.moment.tabs.map(({ id }) => id));
		return tabIds
			.filter((id) => held.has(id))
			.reduce((ensured, tabId) => withPageEnsured(ensured, facts, { tabId, why: "flow opened" }).showing, showing);
	};
}
