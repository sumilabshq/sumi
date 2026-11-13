import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, PopoverItem, PopoverSeparator } from "@widgetarium/kit";
import type { WorkingFolders } from "@widgetarium/assistant/contract";
import { folderNameOf, shortPathOf } from "../../lib/short-path.js";

export interface FolderMenuProps {
	readonly folders: WorkingFolders;
	readonly onChoose: (path: string) => void;
	readonly onPickAnother: () => void;
}

const FOLDERS_IN = "Folders in {workspace}";
const OPEN_ANOTHER = "Open another folder…";

export function FolderMenu({ folders, onChoose, onPickAnother }: FolderMenuProps): ReactElement {
	return (
		<>
			<div className="wg-kit-menu-label">{FOLDERS_IN.replace("{workspace}", folders.workspace)}</div>
			{folders.recent.map((path) => (
				<PopoverItem
					key={path}
					checked={path === folders.current}
					sub={shortPathOf(path)}
					onClick={() => onChoose(path)}
				>
					<Icon name="folder" size={16} />
					{folderNameOf(path)}
				</PopoverItem>
			))}
			{folders.recent.length === 0 ? null : <PopoverSeparator />}
			<PopoverItem onClick={onPickAnother}>
				<Icon name="folder-plus" size={16} />
				{OPEN_ANOTHER}
			</PopoverItem>
		</>
	);
}
