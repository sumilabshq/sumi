import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/data-framework";
import { navigation } from "@widgetarium/navigation/contract";
import type { FlowsSidebarFacts } from "../../../../shared/lib/flow-facts.js";
import type { FlowActs } from "../../../../shared/lib/use-flow-acts.js";
import { FlowRowGlyph } from "../../../../shared/ui/flow-glyph/flow-row-glyph.js";
import { StatusMark } from "../../../../shared/ui/status-mark/status-mark.js";
import { INBOX_SHORT_ROWS, folderNamesByFlow, shownInboxRows } from "../../lib/inbox-view.js";
import { ClearedNotice } from "./cleared-notice.js";
import { MarkAllReadButton } from "./mark-all-read-button.js";
import { useInboxClearing } from "../../lib/use-inbox-clearing.js";

export interface InboxSectionProps {
	readonly sidebar: FlowsSidebarFacts;
	readonly acts: FlowActs;
}

export function InboxSection({ sidebar, acts }: InboxSectionProps): ReactElement | null {
	const rows = useQuery(navigation.inbox.rows).data.rows;
	const clearing = useInboxClearing();
	const [isExpanded, setIsExpanded] = useState(false);
	const folderNames = folderNamesByFlow(sidebar);

	if (rows.length === 0) {
		return clearing.canUndo ? <ClearedNotice failure={clearing.failure} onUndo={clearing.undo} /> : null;
	}

	return (
		<section className="sumi-flows-section" aria-label="Inbox">
			<div className="sumi-flows-label">
				<span>{clearing.failure ?? "Inbox"}</span>
				{clearing.canUndo ? (
					<button type="button" className="sumi-flows-label-action" onClick={clearing.undo}>
						Undo
					</button>
				) : (
					<MarkAllReadButton onClear={clearing.clear} />
				)}
			</div>
			{shownInboxRows(rows, isExpanded).map((flow) => (
				<div className="sumi-flows-row" data-kind="flow" key={flow.id}>
					<button type="button" className="sumi-flows-row-main" onClick={() => acts.open(flow.id)}>
						<FlowRowGlyph flow={flow} />
						<span className="sumi-flows-name">{flow.name}</span>
						<span className="sumi-flows-sub">{folderNames.get(flow.id)}</span>
					</button>
					<StatusMark status={flow.status} />
				</div>
			))}
			{isExpanded || rows.length <= INBOX_SHORT_ROWS ? null : (
				<button type="button" className="sumi-flows-more" onClick={() => setIsExpanded(true)}>
					Show more
				</button>
			)}
		</section>
	);
}
