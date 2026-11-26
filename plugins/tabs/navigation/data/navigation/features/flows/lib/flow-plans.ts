import {
	flowOfId,
	placeProblemOf,
	withFlowAdded,
	withFlowChanged,
	withFlowPlaced,
	withoutFlow,
} from "../../../shared/lib/flows/flow-docs.js";
import { withHomeTabsInEmptyFlows } from "../../../shared/lib/flows/flow-home-tabs.js";
import { blankFlowOf } from "../../../shared/lib/flows/flow-shown.js";
import { flowHolderOf } from "../../../shared/lib/flows/flow-rows.js";
import { flowTabIdsOf } from "../../../shared/lib/flows/flow-nodes.js";
import { withTabsClosed } from "../../../shared/lib/showing/closing.js";
import { refusal, settling } from "../../../shared/lib/settling/settling.js";
import type { Answer, ShowingPlan } from "../../../shared/lib/settling/settling.js";
import { tabsMoveAsPlaces } from "../../../shared/lib/flows/flow-moves.js";
import type { FlowsPlan, MovePlaces } from "../../../shared/lib/flows/flow-moves.js";
import type { PlacedApps } from "../../../shared/lib/tabs/app-abilities.js";
import type {
	CreateFlowAskSchema,
	MoveFlowAskSchema,
	RemoveFlowAskSchema,
	RenameAskSchema,
	SetIconAskSchema,
} from "../../../shared/schema/flow-asks.schema.js";
import type { TabsSettled } from "../../../shared/schema/screen.schema.js";
import type { z } from "zod";

type CreateFlowAsk = z.infer<typeof CreateFlowAskSchema>;
type RenameAsk = z.infer<typeof RenameAskSchema>;
type SetIconAsk = z.infer<typeof SetIconAskSchema>;
type MoveFlowAsk = z.infer<typeof MoveFlowAskSchema>;
type RemoveFlowAsk = z.infer<typeof RemoveFlowAskSchema>;

export interface FlowBirth {
	readonly id: string;
	readonly at: number;
}

const NO_FLOW = 'no flow "{id}" stands here';
const HELD_ELSEWHERE = 'the flow "{id}" is open in window {window}: only that window removes it';
const NO_EFFECTS: TabsSettled = { effects: [] };

export function createFlowPlan(
	ask: CreateFlowAsk,
	birth: FlowBirth,
	apps: PlacedApps,
): FlowsPlan<{ readonly flowId: string }> {
	return ({ tabs, flows }) => {
		if (flowOfId(flows, birth.id) !== undefined) {
			return { flows, reason: `flow ${birth.id} stands already, create skipped`, value: { flowId: birth.id } };
		}

		const problem = placeProblemOf(flows, ask.place);

		if (problem !== null) {
			return refusal(problem);
		}

		const flow = blankFlowOf(birth.id, ask.name, birth.at);
		const homed = withHomeTabsInEmptyFlows({ tabs, flows: withFlowAdded(flows, flow, ask.place) }, apps);
		return {
			flows: homed.flows,
			tabs: homed.tabs,
			reason: [
				`flows ${flows.flows.length} → ${flows.flows.length + 1} (create ${birth.id} "${ask.name}" in ${ask.place.folderId ?? "no folder"})`,
				...homed.said,
			].join("; "),
			value: { flowId: birth.id },
		};
	};
}

export function renameFlowPlan({ id, name }: RenameAsk): FlowsPlan<null> {
	return ({ flows }) => {
		const flow = flowOfId(flows, id);

		if (flow === undefined) {
			return refusal(NO_FLOW.replace("{id}", id));
		}

		return {
			flows:
				flow.name === name && flow.isNamedByHand ? flows : withFlowChanged(flows, id, { name, isNamedByHand: true }),
			reason: `flow ${id} name "${flow.name}" → "${name}"`,
			value: null,
		};
	};
}

export function setFlowIconPlan({ id, icon }: SetIconAsk): FlowsPlan<null> {
	return ({ flows }) => {
		const flow = flowOfId(flows, id);

		if (flow === undefined) {
			return refusal(NO_FLOW.replace("{id}", id));
		}

		return {
			flows: JSON.stringify(flow.icon) === JSON.stringify(icon) ? flows : withFlowChanged(flows, id, { icon }),
			reason: `flow ${id} icon ${JSON.stringify(flow.icon)} → ${JSON.stringify(icon)}`,
			value: null,
		};
	};
}

export function moveFlowPlan({ flowId, place }: MoveFlowAsk): FlowsPlan<null> {
	return ({ flows }) => {
		if (flowOfId(flows, flowId) === undefined) {
			return refusal(NO_FLOW.replace("{id}", flowId));
		}

		const problem = placeProblemOf(flows, place);

		if (problem !== null) {
			return refusal(problem);
		}

		return {
			flows: withFlowPlaced(flows, flowId, place),
			reason: `flow ${flowId} moved to ${place.folderId ?? "no folder"} before ${place.before ?? "the end"}`,
			value: null,
		};
	};
}

export function removeFlowMove(ask: RemoveFlowAsk, apps: PlacedApps): MovePlaces<Answer<TabsSettled>> {
	const refused = (reason: string): ReturnType<MovePlaces<Answer<TabsSettled>>> => ({
		next: null,
		reason,
		answer: { isRefused: true, reason },
	});
	return (now) => {
		const flow = now.flows === null ? undefined : flowOfId(now.flows, ask.flowId);

		if (now.flows === null || flow === undefined) {
			return refused(NO_FLOW.replace("{id}", ask.flowId));
		}

		const holder = flowHolderOf(now.tabs, now.flows, { flowId: ask.flowId, window: ask.at.window });

		if (holder !== null) {
			return refused(HELD_ELSEWHERE.replace("{id}", ask.flowId).replace("{window}", holder));
		}

		const ids = flowTabIdsOf(flow);
		const closed =
			ids.length === 0
				? null
				: tabsMoveAsPlaces(settling(ask.at, apps, closeTabsPlan(ids, `remove flow ${ask.flowId}`)))(now);

		if (closed?.answer.isRefused === true) {
			return closed;
		}

		return {
			next: {
				tabs: closed?.next?.tabs ?? now.tabs,
				flows: withoutFlow(closed?.next?.flows ?? now.flows, ask.flowId),
			},
			reason: `flows ${now.flows.flows.length} → ${now.flows.flows.length - 1} (remove ${ask.flowId} with ${ids.length} tabs)`,
			answer: closed?.answer ?? { isRefused: false, value: NO_EFFECTS },
		};
	};
}

function closeTabsPlan(ids: readonly string[], reason: string): ShowingPlan {
	return (showing, facts) => withTabsClosed(showing, facts, { ids, reason });
}
