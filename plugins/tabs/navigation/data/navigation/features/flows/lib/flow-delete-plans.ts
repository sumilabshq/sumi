import { flowOfId } from "../../../shared/lib/flows/flow-docs.js";
import type { MovePlaces } from "../../../shared/lib/flows/flow-moves.js";
import { flowTabIdsOf } from "../../../shared/lib/flows/flow-nodes.js";
import type { Answer } from "../../../shared/lib/settling/settling.js";
import type { PlacedApps } from "../../../shared/lib/tabs/app-abilities.js";
import type { RemoveFlowAskSchema } from "../../../shared/schema/flow-asks.schema.js";
import type { TabsSettled } from "../../../shared/schema/screen.schema.js";
import { removeFlowMove } from "./flow-plans.js";
import type { z } from "zod";

type RemoveFlowAsk = z.infer<typeof RemoveFlowAskSchema>;

export function deleteFlowMove(ask: RemoveFlowAsk, apps: PlacedApps): MovePlaces<Answer<TabsSettled>> {
	const removing = removeFlowMove(ask, apps);
	return (now) => {
		const flow = now.flows === null ? undefined : flowOfId(now.flows, ask.flowId);
		const removed = removing(now);

		if (flow === undefined || removed.next === null || removed.answer.isRefused) {
			return removed;
		}

		const own = new Set(flowTabIdsOf(flow));
		const { closed } = removed.next.tabs;
		const kept = closed.filter(({ tab }) => !own.has(tab.id));
		return {
			next: { ...removed.next, tabs: { ...removed.next.tabs, closed: kept } },
			reason: `${removed.reason}; closed history ${closed.length} → ${kept.length} (deleted ${ask.flowId})`,
			answer: removed.answer,
		};
	};
}
