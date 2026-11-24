import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import type { FlowDrag } from "../../../../shared/lib/flow-drag.js";
import type { FolderRowFacts } from "../../../../shared/lib/flow-facts.js";
import type { FlowActs } from "../../../../shared/lib/use-flow-acts.js";
import { RowField } from "../row-field/row-field.js";
import { RowMenu } from "../row-menu/row-menu.js";
import { FolderLine } from "./folder-line.js";

const NEW_FLOW = "New flow";

export interface FolderRowViewProps {
	readonly folder: FolderRowFacts;
	readonly acts: FlowActs;
	readonly drag: FlowDrag;
}

export function FolderRowView({ folder, acts, drag }: FolderRowViewProps): ReactElement {
	const [isRenaming, setIsRenaming] = useState(false);
	const addFlow = (): void => {
		acts.create(NEW_FLOW, { folderId: folder.id, before: null });

		if (!folder.isOpen) {
			acts.toggleFolder(folder.id);
		}
	};

	if (isRenaming) {
		return (
			<RowField
				name={folder.name}
				icon={folder.icon}
				fallback="folder"
				color={{
					value: folder.color,
					onPick: (color) => acts.setFolderColor(folder.id, color),
				}}
				onCommit={(name) => acts.rename("folder", folder.id, name)}
				onIcon={(icon) => acts.setIcon("folder", folder.id, icon)}
				onDone={() => setIsRenaming(false)}
			/>
		);
	}

	return (
		<RowMenu
			items={[
				{ label: "Rename", onSelect: () => setIsRenaming(true) },
				{ label: "Remove folder", onSelect: () => acts.removeFolder(folder.id), isDestructive: true },
			]}
		>
			<FolderLine
				folder={folder}
				drag={drag}
				onToggle={() => acts.toggleFolder(folder.id)}
				onRename={() => setIsRenaming(true)}
				onAdd={addFlow}
			/>
		</RowMenu>
	);
}
