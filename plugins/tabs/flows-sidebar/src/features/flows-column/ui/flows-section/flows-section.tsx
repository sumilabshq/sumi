import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { FlowDrag } from "../../../../shared/lib/flow-drag.js";
import type { FlowsSidebarFacts } from "../../../../shared/lib/flow-facts.js";
import type { FlowActs } from "../../../../shared/lib/use-flow-acts.js";
import { FlowGlyph } from "../../../../shared/ui/flow-glyph/flow-glyph.js";
import { FlowRowView } from "../../../flow-rows/ui/flow-row/flow-row.js";
import { FolderRowView } from "../../../flow-rows/ui/folder-row/folder-row.js";

const QUICK_QUESTION = "Quick question";

export interface FlowsSectionProps {
	readonly sidebar: FlowsSidebarFacts;
	readonly acts: FlowActs;
	readonly drag: FlowDrag;
}

export function FlowsSection({ sidebar, acts, drag }: FlowsSectionProps): ReactElement {
	const { looseFlows, folders, windowFlowId } = sidebar;
	const firstLooseId = looseFlows[0]?.id ?? null;
	return (
		<section className="sumi-flows-section" aria-label="Flows" {...drag.targetProps({ kind: "loose" })}>
			<div className="sumi-flows-label">
				<span>Flows</span>
			</div>
			<div className="sumi-flows-row" data-kind="flow">
				<button
					type="button"
					className="sumi-flows-row-main"
					onClick={() => acts.create(QUICK_QUESTION, { folderId: null, before: firstLooseId })}
				>
					<FlowGlyph icon={null} fallback="dot" />
					<span className="sumi-flows-name">{QUICK_QUESTION}</span>
				</button>
			</div>
			{looseFlows.map((flow) => (
				<FlowRowView key={flow.id} flow={flow} folderId={null} isCurrent={flow.id === windowFlowId} acts={acts} drag={drag} />
			))}
			{folders.map((folder) => (
				<div className="sumi-flows-folder" key={folder.id}>
					<FolderRowView folder={folder} acts={acts} drag={drag} />
					{folder.isOpen
						? folder.flows.map((flow) => (
								<FlowRowView
									key={flow.id}
									flow={flow}
									folderId={folder.id}
									isCurrent={flow.id === windowFlowId}
									acts={acts}
									drag={drag}
								/>
							))
						: null}
				</div>
			))}
		</section>
	);
}
