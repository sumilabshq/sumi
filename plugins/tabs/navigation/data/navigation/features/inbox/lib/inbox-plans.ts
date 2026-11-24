import type { FlowRow, RowFacts } from "../../../shared/lib/flows/flow-rows.js";
import { flowRowOf } from "../../../shared/lib/flows/flow-rows.js";
import { READ_ON_OPEN, marksCleared, marksRestored } from "../../../shared/lib/flows/flow-marks.js";
import type { FlowsPlan } from "../../../shared/lib/flows/flow-moves.js";
import { refusal } from "../../../shared/lib/settling/settling.js";
import type { PlacedApps } from "../../../shared/lib/tabs/app-abilities.js";

export interface InboxCleared {
	readonly clearId: string;
	readonly clearedTabIds: readonly string[];
}

export interface ClearMoment {
	readonly clearId: string;
	readonly at: number;
	readonly apps: PlacedApps;
}

const MOST_URGENT_FIRST: readonly string[] = ["failed", "asking", "unread"];
const NOTHING_TO_UNDO = 'nothing to undo for the clear "{id}"';

export function inboxRowsOf(facts: RowFacts): readonly FlowRow[] {
	return facts.doc.flows
		.map((flow) => flowRowOf(flow, facts))
		.filter(
			(row) =>
				row.status !== null && MOST_URGENT_FIRST.includes(row.status) && !(row.status === "asking" && row.isOpen),
		)
		.sort((one, other) => MOST_URGENT_FIRST.indexOf(one.status ?? "") - MOST_URGENT_FIRST.indexOf(other.status ?? ""));
}

export function clearInboxPlan({ clearId, at, apps }: ClearMoment): FlowsPlan<InboxCleared> {
	return ({ tabs, flows }) => {
		const inboxChatIds = new Set(
			inboxRowsOf({ placed: tabs, doc: flows, apps }).flatMap((row) => row.chats.map(({ id }) => id)),
		);
		const read = marksCleared(tabs, inboxChatIds, READ_ON_OPEN);
		const value = { clearId, clearedTabIds: read.changes.map(({ tabId }) => tabId) };

		if (read.changes.length === 0) {
			return { flows, reason: "inbox clear skipped: no flow is unread or failed", value };
		}

		return {
			tabs: read.placed,
			flows: { ...flows, inboxUndo: { clearId, at, marks: [...read.changes] } },
			reason: `inbox clear ${clearId}: marks ${read.changes.map(({ tabId, mark }) => `${tabId} ${mark}`).join(", ")} → none`,
			value,
		};
	};
}

export function undoInboxClearPlan(clearId: string): FlowsPlan<InboxCleared> {
	return ({ tabs, flows }) => {
		if (flows.inboxUndo === null || flows.inboxUndo.clearId !== clearId) {
			return refusal(NOTHING_TO_UNDO.replace("{id}", clearId));
		}

		const restored = marksRestored(tabs, flows.inboxUndo);
		return {
			tabs: restored.placed,
			flows: { ...flows, inboxUndo: null },
			reason: `inbox undo ${clearId}: marks ${restored.changes.map(({ tabId, mark }) => `none → ${mark} on ${tabId}`).join(", ") || "none restored (tabs moved on)"}`,
			value: { clearId, clearedTabIds: restored.changes.map(({ tabId }) => tabId) },
		};
	};
}
