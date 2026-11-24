import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { dropKeyOf } from "../../../../shared/lib/flow-drag.js";
import type { DropTarget, FlowDrag } from "../../../../shared/lib/flow-drag.js";
import type { FlowRowFacts } from "../../../../shared/lib/flow-facts.js";
import type { FlowActs } from "../../../../shared/lib/use-flow-acts.js";
import { FlowGlyph } from "../../../../shared/ui/flow-glyph/flow-glyph.js";
import { StatusMark } from "../../../../shared/ui/status-mark/status-mark.js";
import { ChatsHover } from "../chats-panel/chats-panel.js";
import { RowField } from "../row-field/row-field.js";
import { RowMenu } from "../row-menu/row-menu.js";

export interface FlowRowViewProps {
	readonly flow: FlowRowFacts;
	readonly folderId: string | null;
	readonly isCurrent: boolean;
	readonly acts: FlowActs;
	readonly drag: FlowDrag;
}

export function FlowRowView({ flow, folderId, isCurrent, acts, drag }: FlowRowViewProps): ReactElement {
	const [isRenaming, setIsRenaming] = useState(false);
	const target: DropTarget = { kind: "flow", flowId: flow.id, folderId };

	if (isRenaming) {
		return (
			<RowField
				name={flow.name}
				icon={flow.icon}
				fallback="dot"
				onCommit={(name) => acts.rename("flow", flow.id, name)}
				onIcon={(icon) => acts.setIcon("flow", flow.id, icon)}
				onDone={() => setIsRenaming(false)}
			/>
		);
	}

	return (
		<RowMenu
			items={[
				{ label: "Rename", onSelect: () => setIsRenaming(true) },
				{ label: "Delete flow", onSelect: () => acts.remove(flow.id), isDestructive: true },
			]}
		>
			<ChatsHover chats={flow.chats}>
				<div
					className="sumi-flows-row"
					data-kind="flow"
					data-indented={folderId === null ? undefined : ""}
					data-current={isCurrent ? "" : undefined}
					data-drop={drag.overKey === dropKeyOf(target) ? "" : undefined}
					{...drag.sourceProps(flow.id)}
					{...drag.targetProps(target)}
				>
					<button
						type="button"
						className="sumi-flows-row-main"
						aria-current={isCurrent ? "true" : undefined}
						onClick={() => acts.open(flow.id)}
						onDoubleClick={() => setIsRenaming(true)}
					>
						<FlowGlyph icon={flow.icon} fallback="dot" />
						<span className="sumi-flows-name">{flow.name}</span>
					</button>
					<StatusMark status={flow.status} />
				</div>
			</ChatsHover>
		</RowMenu>
	);
}
