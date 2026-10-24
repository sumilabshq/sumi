import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { useCommand } from "@widgetarium/core/requests";
import { folderNameOf, shortPathOf } from "../../lib/short-path.js";
import { useMenuOpening } from "../../lib/menu-spot.js";
import { GlassMenu } from "../glass-menu/glass-menu.js";
import { GlassMenuLine } from "../glass-menu/glass-menu-line.js";
import { GlassMenuRow } from "../glass-menu/glass-menu-row.js";
import { StripButton } from "./strip-button.js";
import { ChooseWorkingFolderCommand, PickWorkingFolderCommand } from "@widgetarium/assistant";
import type { WorkingFolders } from "@widgetarium/assistant";

const CHOOSE_A_FOLDER = "Choose a folder";
const WORK_IN_A_FOLDER = "Work in a folder…";
const FOLDERS_IN = "Folders in {workspace}";
const OPEN_ANOTHER = "Open another folder…";
const FOLDER_MENU_PX = 312;

export function FolderButton({ folders }: { readonly folders: WorkingFolders }): ReactElement {
	const menu = useMenuOpening();
	const choose = useCommand(ChooseWorkingFolderCommand);
	const pickAnother = useCommand(PickWorkingFolderCommand);
	return (
		<>
			<StripButton label={CHOOSE_A_FOLDER} isOutlined isOn={menu.spot !== null} onOpen={menu.openAt}>
				<Icon name="folder" size={15} />
				{folders.current === null ? WORK_IN_A_FOLDER : folderNameOf(folders.current)}
			</StripButton>
			<GlassMenu
				spot={menu.spot}
				label={FOLDERS_IN.replace("{workspace}", folders.workspace)}
				width={FOLDER_MENU_PX}
				onDismiss={menu.close}
			>
				{folders.recent.map((path) => (
					<GlassMenuRow
						key={path}
						text={folderNameOf(path)}
						small={shortPathOf(path)}
						mark={<Icon name="folder" size={16} />}
						isPicked={path === folders.current}
						onPick={() => {
							menu.close();
							void choose.run({ path });
						}}
					/>
				))}
				{folders.recent.length === 0 ? null : <GlassMenuLine />}
				<GlassMenuRow
					text={OPEN_ANOTHER}
					mark={<Icon name="folder-plus" size={16} />}
					onPick={() => {
						menu.close();
						void pickAnother.run();
					}}
				/>
			</GlassMenu>
		</>
	);
}
