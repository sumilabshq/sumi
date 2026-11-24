import type { FlowRowFacts, FlowsSidebarFacts } from "../../../shared/lib/flow-facts.js";

export const INBOX_SHORT_ROWS = 3;

export function shownInboxRows(rows: readonly FlowRowFacts[], isExpanded: boolean): readonly FlowRowFacts[] {
	return isExpanded ? rows : rows.slice(0, INBOX_SHORT_ROWS);
}

export function folderNamesByFlow(sidebar: FlowsSidebarFacts): ReadonlyMap<string, string> {
	const names = new Map<string, string>();

	for (const folder of sidebar.folders) {
		for (const flow of folder.flows) {
			names.set(flow.id, folder.name);
		}
	}

	return names;
}
