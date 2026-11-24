import type { z } from "zod";
import { flowOfId, withFlowChanged } from "../../../shared/lib/flows/flow-docs.js";
import { isRefusedEdit } from "../../../shared/lib/flows/flow-pane-edits.js";
import type { LayoutEdit } from "../../../shared/lib/flows/flow-pane-edits.js";
import type { FlowsPlan } from "../../../shared/lib/flows/flow-moves.js";
import { flowHolderOf } from "../../../shared/lib/flows/flow-rows.js";
import { refusal } from "../../../shared/lib/settling/settling.js";
import type { FlowLayout } from "../../../shared/schema/flows.schema.js";
import type { PaneFlowAskSchema } from "../../../shared/schema/flow-asks.schema.js";

type PaneFlowAsk = z.infer<typeof PaneFlowAskSchema>;

const NO_FLOW = 'no flow "{id}" stands here';
const HELD_ELSEWHERE = 'the flow "{id}" is open in window {window}: only that window changes its panes';

export function paneEditPlan(
	ask: PaneFlowAsk,
	said: string,
	edit: (layout: FlowLayout) => LayoutEdit,
): FlowsPlan<null> {
	return ({ tabs, flows }) => {
		const flow = flowOfId(flows, ask.flowId);

		if (flow === undefined) {
			return refusal(NO_FLOW.replace("{id}", ask.flowId));
		}

		const holder = flowHolderOf(tabs, flows, ask);

		if (holder !== null) {
			return refusal(HELD_ELSEWHERE.replace("{id}", ask.flowId).replace("{window}", holder));
		}

		const edited = edit(flow.layout);

		if (isRefusedEdit(edited)) {
			return refusal(edited);
		}

		return {
			flows:
				JSON.stringify(edited) === JSON.stringify(flow.layout)
					? flows
					: withFlowChanged(flows, ask.flowId, { layout: edited }),
			reason: `flow ${ask.flowId} panes ${said}`,
			value: null,
		};
	};
}
