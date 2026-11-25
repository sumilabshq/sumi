import { createElement as h, Fragment, useState } from "react";
import type { ReactElement } from "react";
import { dropKeyOf } from "../../../../shared/lib/flow-drag.js";
import type { DropTarget, FlowDrag } from "../../../../shared/lib/flow-drag.js";
import type { FlowRowFacts, FlowsSidebarFacts } from "../../../../shared/lib/flow-facts.js";
import type { FlowActs } from "../../../../shared/lib/use-flow-acts.js";
import { ConfirmDelete } from "../../../../shared/ui/confirm-delete/confirm-delete.js";
import { FlowGlyph } from "../../../../shared/ui/flow-glyph/flow-glyph.js";
import { StatusMark } from "../../../../shared/ui/status-mark/status-mark.js";
import { FLOW_RENAME_KEYS, RENAME_KEY, renamesOn } from "../../lib/rename-keys.js";
import { ChatsHover } from "../chats-panel/chats-panel.js";
import { CloseFlowButton } from "../close-flow/close-flow-button.js";
import { RowField } from "../row-field/row-field.js";
import { MoveToSection } from "../move-to-section/move-to-section.js";
import { RowMenu } from "../row-menu/row-menu.js";

const FLOW_MENU = "Flow";

function chatCountOf(count: number): string {
	return count === 1 ? "1 chat" : `${count} chats`;
}

export interface FlowRowViewProps {
	readonly flow: FlowRowFacts;
	readonly folderId: string | null;
	readonly projectId: string;
	readonly sidebar: FlowsSidebarFacts;
	readonly isCurrent: boolean;
	readonly acts: FlowActs;
	readonly drag: FlowDrag;
}

export function FlowRowView({
	flow,
	folderId,
	projectId,
	sidebar,
	isCurrent,
	acts,
	drag,
}: FlowRowViewProps): ReactElement {
	const [isRenaming, setIsRenaming] = useState(false);
	const [opensPicker, setOpensPicker] = useState(false);
	const [isConfirming, setIsConfirming] = useState(false);
	const editIcon = (): void => {
		setOpensPicker(true);
		setIsRenaming(true);
	};
	const target: DropTarget = { kind: "flow", flowId: flow.id, folderId, projectId };

	if (isRenaming) {
		return (
			<RowField
				name={flow.name}
				icon={flow.icon}
				fallback="dot"
				opensPicker={opensPicker}
				onCommit={(name) => acts.rename("flow", flow.id, name)}
				onIcon={(icon) => acts.setIcon("flow", flow.id, icon)}
				onDone={() => {
					setIsRenaming(false);
					setOpensPicker(false);
				}}
			/>
		);
	}

	return (
		<Fragment>
			<RowMenu
				label={FLOW_MENU}
				section={(close) => <MoveToSection flow={flow} sidebar={sidebar} acts={acts} onClose={close} />}
				items={[
					{ label: "Rename", icon: "pencil-line", keys: RENAME_KEY, onSelect: () => setIsRenaming(true) },
					{ label: "Edit icon", icon: "image", onSelect: editIcon },
					{ label: "Duplicate", icon: "copy", onSelect: () => acts.duplicate(flow.id) },
					{ label: "Archive", icon: "archive", onSelect: () => acts.archive(flow.id) },
					{ label: "Delete flow", icon: "trash", onSelect: () => setIsConfirming(true), isDestructive: true },
				]}
			>
				<ChatsHover chats={flow.chats}>
					{(hover) => (
						<div
							{...hover}
							className="sumi-flows-row"
							data-kind="flow"
							data-indented={folderId === null ? undefined : ""}
							data-current={isCurrent ? "" : undefined}
							data-drop={drag.overKey === dropKeyOf(target) ? "" : undefined}
							{...drag.sourceProps({ kind: "flow", id: flow.id })}
							{...drag.targetProps(target)}
						>
							<button
								type="button"
								className="sumi-flows-row-main"
								aria-current={isCurrent ? "true" : undefined}
								onClick={() => acts.open(flow.id)}
								onDoubleClick={() => setIsRenaming(true)}
								onKeyDown={renamesOn(FLOW_RENAME_KEYS, () => setIsRenaming(true))}
							>
								<FlowGlyph icon={flow.icon} fallback="dot" />
								<span className="sumi-flows-name">{flow.name}</span>
							</button>
							<StatusMark status={flow.status} />
							<CloseFlowButton flow={flow} acts={acts} />
						</div>
					)}
				</ChatsHover>
			</RowMenu>
			<ConfirmDelete
				isOpen={isConfirming}
				title={`Delete "${flow.name}"?`}
				description={`The Flow, its tabs and its ${chatCountOf(flow.chats.length)} are deleted from this device. This cannot be undone.`}
				confirmLabel="Delete flow"
				onConfirm={() => acts.deleteFlow(flow.id)}
				onClose={() => setIsConfirming(false)}
			/>
		</Fragment>
	);
}
