import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { dragKeyOf } from "../../../../shared/lib/flow-drag.js";
import type { DropTarget, FlowDrag } from "../../../../shared/lib/flow-drag.js";
import type { FolderRowFacts } from "../../../../shared/lib/flow-facts.js";
import type { TopRef } from "../../../../shared/lib/use-flow-acts.js";
import { FlowGlyph } from "../../../../shared/ui/flow-glyph/flow-glyph.js";
import { StatusMark } from "../../../../shared/ui/status-mark/status-mark.js";
import { FOLDER_RENAME_KEYS, renamesOn } from "../../lib/rename-keys.js";

const CHEVRON_PX = 12;

export interface FolderLineProps {
	readonly folder: FolderRowFacts;
	readonly nextTop: TopRef | null;
	readonly drag: FlowDrag;
	readonly onToggle: () => void;
	readonly onRename: () => void;
	readonly onAdd: () => void;
}

export function FolderLine({ folder, nextTop, drag, onToggle, onRename, onAdd }: FolderLineProps): ReactElement {
	const target: DropTarget = {
		kind: "folder",
		folderId: folder.id,
		isOpen: folder.isOpen,
		nextTop,
		projectId: folder.projectId,
	};
	return (
		<div
			className="sumi-flows-row"
			data-kind="folder"
			data-color={folder.color ?? undefined}
			data-dragging={drag.draggingKey === dragKeyOf({ kind: "folder", id: folder.id }) ? "" : undefined}
			{...drag.sourceProps({ kind: "folder", id: folder.id })}
			{...drag.targetProps(target)}
		>
			<button
				type="button"
				className="sumi-flows-row-main"
				aria-expanded={folder.isOpen}
				onClick={onToggle}
				onKeyDown={renamesOn(FOLDER_RENAME_KEYS, onRename)}
			>
				<FlowGlyph icon={folder.icon} fallback="folder" />
				<span className="sumi-flows-chevron">
					<Icon name={folder.isOpen ? "chevron-down" : "chevron-right"} size={CHEVRON_PX} />
				</span>
				<span className="sumi-flows-name">{folder.name}</span>
			</button>
			{folder.isOpen ? null : <StatusMark status={folder.status} />}
			<button type="button" className="sumi-flows-add" aria-label={`New session in ${folder.name}`} onClick={onAdd}>
				<Icon name="plus" size={CHEVRON_PX} />
			</button>
		</div>
	);
}
