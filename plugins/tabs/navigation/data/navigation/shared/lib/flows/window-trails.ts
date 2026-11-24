import type { FlowsDoc, ViewSpot, WindowTrail } from "../../schema/flows.schema.js";
import type { PlacedTabs } from "../../schema/tabs.schema.js";
import { flowOfId } from "./flow-docs.js";
import { flowPanesOf, flowTabIdsOf } from "./flow-nodes.js";
import { flowHolderOf } from "./flow-rows.js";

export type TrailStep = "back" | "forward";

export interface SteppedTrail {
	readonly to: ViewSpot;
	readonly trail: WindowTrail;
}

interface TrailPlace {
	readonly doc: FlowsDoc;
	readonly placed: PlacedTabs;
	readonly window: string;
}

const MOST_STEPS_KEPT = 50;
const NO_TRAIL: WindowTrail = { back: [], forward: [] };

export function trailOf(doc: FlowsDoc, window: string): WindowTrail {
	return doc.windowTrails?.[window] ?? NO_TRAIL;
}

export function viewOf(doc: FlowsDoc, window: string): ViewSpot | null {
	const flowId = doc.windowFlows[window];
	const flow = flowId === undefined ? undefined : flowOfId(doc, flowId);

	if (flowId === undefined || flow === undefined) {
		return null;
	}

	const tabId = flowPanesOf(flow).find(({ id }) => id === flow.layout.focusedPaneId)?.activeTabId ?? null;
	return tabId === null ? null : { flowId, tabId };
}

export function spotSaid(spot: ViewSpot | null): string {
	return spot === null ? "none" : `${spot.flowId}/${spot.tabId}`;
}

export function withViewsRecorded(was: FlowsDoc, now: FlowsDoc): FlowsDoc {
	const left = Object.keys(now.windowFlows).flatMap((window) => {
		const from = viewOf(was, window);
		const to = viewOf(now, window);
		const isStepped = trailOf(now, window) !== trailOf(was, window);
		return isStepped || from === null || to === null || isSameSpot(from, to) ? [] : [{ window, from }];
	});

	if (left.length === 0) {
		return now;
	}

	const recorded = left.map(({ window, from }) => [
		window,
		{ back: keptSteps([...trailOf(now, window).back, from]), forward: [] },
	]);
	return { ...now, windowTrails: { ...now.windowTrails, ...Object.fromEntries(recorded) } };
}

export function steppedTrailOf(place: TrailPlace, step: TrailStep): SteppedTrail | null {
	const here = viewOf(place.doc, place.window);
	const { back, forward } = trailOf(place.doc, place.window);
	const stays = here === null ? [] : [here];
	const kept = (spots: readonly ViewSpot[]): ViewSpot[] => spots.filter((spot) => !isGone(place.doc, spot));

	if (step === "back") {
		const fromEnd = [...back].reverse().findIndex((spot) => isReachable(place, spot, here));
		const at = fromEnd === -1 ? -1 : back.length - 1 - fromEnd;
		const to = back[at];
		return to === undefined
			? null
			: { to, trail: { back: kept(back.slice(0, at)), forward: [...kept(back.slice(at + 1)), ...stays, ...forward] } };
	}

	const at = forward.findIndex((spot) => isReachable(place, spot, here));
	const to = forward[at];
	return to === undefined
		? null
		: {
				to,
				trail: { back: keptSteps([...back, ...stays, ...kept(forward.slice(0, at))]), forward: forward.slice(at + 1) },
			};
}

function isGone(doc: FlowsDoc, spot: ViewSpot): boolean {
	const flow = flowOfId(doc, spot.flowId);
	return flow === undefined || !flowTabIdsOf(flow).includes(spot.tabId);
}

function isReachable({ doc, placed, window }: TrailPlace, spot: ViewSpot, here: ViewSpot | null): boolean {
	return (
		!isGone(doc, spot) &&
		flowHolderOf(placed, doc, { flowId: spot.flowId, window }) === null &&
		(here === null || !isSameSpot(spot, here))
	);
}

function isSameSpot(one: ViewSpot, other: ViewSpot): boolean {
	return one.flowId === other.flowId && one.tabId === other.tabId;
}

function keptSteps(steps: readonly ViewSpot[]): ViewSpot[] {
	return steps.slice(-MOST_STEPS_KEPT);
}
