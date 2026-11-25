import { flowOfId, withFlowChanged } from "../../../shared/lib/flows/flow-docs.js";
import { flowsMove } from "../../../shared/lib/flows/flow-moves.js";
import type {
	FlowsNow,
	FlowsPlan,
	FlowsPlanned,
	MovePlaces,
	PlacedPlaces,
} from "../../../shared/lib/flows/flow-moves.js";
import { isRefusedEdit, layoutWithTabShown } from "../../../shared/lib/flows/flow-pane-edits.js";
import { spotSaid, steppedTrailOf, viewOf } from "../../../shared/lib/flows/window-trails.js";
import type { SteppedTrail, TrailStep } from "../../../shared/lib/flows/window-trails.js";
import { isRefusal, refusal } from "../../../shared/lib/settling/settling.js";
import type { Answer, Refusal } from "../../../shared/lib/settling/settling.js";
import type { PlacedApps } from "../../../shared/lib/tabs/app-abilities.js";
import type { FlowsDoc } from "../../../shared/schema/flows.schema.js";
import type { TabsSettled } from "../../../shared/schema/screen.schema.js";
import type { TrailStepAsk, WindowTrailState } from "../../../shared/schema/window-trail.schema.js";
import { openFlowPlan, withFlowPagesEnsured } from "../../flows/lib/flow-open-plans.js";

const NOWHERE = "window {window} has nothing to go {step} to";

export function trailStateOf({ tabs: placed, flows: doc }: PlacedPlaces, window: string): WindowTrailState {
	if (doc === null) {
		return { canGoBack: false, canGoForward: false };
	}

	const place = { doc, placed, window };
	return {
		canGoBack: steppedTrailOf(place, "back") !== null,
		canGoForward: steppedTrailOf(place, "forward") !== null,
	};
}

export function trailStepMove(ask: TrailStepAsk, step: TrailStep, apps: PlacedApps): MovePlaces<Answer<TabsSettled>> {
	return withFlowPagesEnsured(flowsMove(trailStepPlan(ask, step, apps)), { window: ask.window, at: ask.at, apps });
}

function trailStepPlan(ask: TrailStepAsk, step: TrailStep, apps: PlacedApps): FlowsPlan<TabsSettled> {
	return ({ tabs, flows }) => {
		const stepped = steppedTrailOf({ doc: flows, placed: tabs, window: ask.window }, step);

		if (stepped === null) {
			return refusal(NOWHERE.replace("{window}", ask.window).replace("{step}", step));
		}

		const shown = withSpotShown(flows, stepped);

		if (typeof shown === "string") {
			return refusal(shown);
		}

		const opened = flowShownIn(ask, stepped, { tabs, flows: shown }, apps);

		if (isRefusal(opened)) {
			return opened;
		}

		return {
			...opened,
			flows: { ...opened.flows, windowTrails: { ...opened.flows.windowTrails, [ask.window]: stepped.trail } },
			reason: `window ${ask.window} view ${spotSaid(viewOf(flows, ask.window))} → ${spotSaid(stepped.to)} (${step}); ${opened.reason}`,
		};
	};
}

function flowShownIn(
	ask: TrailStepAsk,
	{ to }: SteppedTrail,
	now: FlowsNow,
	apps: PlacedApps,
): FlowsPlanned<TabsSettled> | Refusal {
	if (now.flows.windowFlows[ask.window] === to.flowId) {
		return { flows: now.flows, reason: `flow ${to.flowId} stays`, value: { effects: [] } };
	}

	return openFlowPlan({ ...ask, flowId: to.flowId }, { apps, at: Date.now() })(now);
}

function withSpotShown(doc: FlowsDoc, { to }: SteppedTrail): FlowsDoc | string {
	const flow = flowOfId(doc, to.flowId);
	const layout = flow === undefined ? `no flow "${to.flowId}"` : layoutWithTabShown(flow.layout, to.tabId);
	return isRefusedEdit(layout) ? layout : withFlowChanged(doc, to.flowId, { layout });
}
