import { flowOfId, withFlowChanged } from "../../../shared/lib/flows/flow-docs.js";
import type { FlowsPlan } from "../../../shared/lib/flows/flow-moves.js";
import { refusal } from "../../../shared/lib/settling/settling.js";
import type { FlowAskSchema } from "../../../shared/schema/flow-asks.schema.js";
import type { FlowsDoc } from "../../../shared/schema/flows.schema.js";
import type { z } from "zod";

type FlowAsk = z.infer<typeof FlowAskSchema>;

const NO_FLOW = 'no flow "{id}" stands here';

export function archiveFlowPlan({ flowId }: FlowAsk, at: number): FlowsPlan<null> {
	return ({ flows }) => {
		const flow = flowOfId(flows, flowId);

		if (flow === undefined) {
			return refusal(NO_FLOW.replace("{id}", flowId));
		}

		if (flow.archivedAt !== null) {
			return { flows, reason: `flow ${flowId} archivedAt ${flow.archivedAt} stays, archive skipped`, value: null };
		}

		return {
			flows: withoutWindowsOn(withFlowChanged(flows, flowId, { archivedAt: at }), flowId),
			reason: `flow ${flowId} archivedAt none → ${at}`,
			value: null,
		};
	};
}

export function unarchiveFlowPlan({ flowId }: FlowAsk): FlowsPlan<null> {
	return ({ flows }) => {
		const flow = flowOfId(flows, flowId);

		if (flow === undefined) {
			return refusal(NO_FLOW.replace("{id}", flowId));
		}

		if (flow.archivedAt === null) {
			return { flows, reason: `flow ${flowId} archivedAt none stays, unarchive skipped`, value: null };
		}

		return {
			flows: withFlowChanged(flows, flowId, { archivedAt: null }),
			reason: `flow ${flowId} archivedAt ${flow.archivedAt} → none`,
			value: null,
		};
	};
}

function withoutWindowsOn(doc: FlowsDoc, flowId: string): FlowsDoc {
	return {
		...doc,
		windowFlows: Object.fromEntries(Object.entries(doc.windowFlows).filter(([, id]) => id !== flowId)),
	};
}
