import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import type { FlowDrag } from "../../../../shared/lib/flow-drag.js";
import type { FolderRowFacts } from "../../../../shared/lib/flow-facts.js";
import type { FlowActs } from "../../../../shared/lib/use-flow-acts.js";
import { ColorDots } from "../row-field/color-dots.js";
import { RowField } from "../row-field/row-field.js";
import { RowMenu } from "../row-menu/row-menu.js";
import { RENAME_KEY } from "../../lib/rename-keys.js";
import { FolderLine } from "./folder-line.js";

const NEW_FLOW = "New flow";
const FOLDER_MENU = "Folder";
const COLOR_LABEL = "Color";

export interface FolderRowViewProps {
	readonly folder: FolderRowFacts;
	readonly acts: FlowActs;
	readonly drag: FlowDrag;
}

export function FolderRowView({ folder, acts, drag }: FolderRowViewProps): ReactElement {
	const [isRenaming, setIsRenaming] = useState(false);
	const [opensPicker, setOpensPicker] = useState(false);
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
				opensPicker={opensPicker}
				color={{
					value: folder.color,
					onPick: (color) => acts.setFolderColor(folder.id, color),
				}}
				onCommit={(name) => acts.rename("folder", folder.id, name)}
				onIcon={(icon) => acts.setIcon("folder", folder.id, icon)}
				onDone={() => {
					setIsRenaming(false);
					setOpensPicker(false);
				}}
			/>
		);
	}

	return (
		<RowMenu
			label={FOLDER_MENU}
			section={(close) => (
				<div className="sumi-flows-menu-colors">
					<span className="sumi-flows-menu-label">{COLOR_LABEL}</span>
					<ColorDots
						choice={{
							value: folder.color,
							onPick: (color) => {
								acts.setFolderColor(folder.id, color);
								close();
							},
						}}
					/>
				</div>
			)}
			items={[
				{ label: "Rename", icon: "pencil-line", keys: RENAME_KEY, onSelect: () => setIsRenaming(true) },
				{
					label: "Edit icon",
					icon: "image",
					onSelect: () => {
						setOpensPicker(true);
						setIsRenaming(true);
					},
				},
				{ label: "Remove folder", icon: "folder-x", onSelect: () => acts.removeFolder(folder.id), isDestructive: true },
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
