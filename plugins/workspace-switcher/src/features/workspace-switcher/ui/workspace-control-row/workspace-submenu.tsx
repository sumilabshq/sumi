import { createElement as h, useState } from "react";
import type { ReactNode } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { Icon, PopoverItem, PopoverSeparator } from "@widgetarium/kit";
import { useControlMenu } from "@sumi/control-menu-plugin";
import type { WorkspacesView } from "@widgetarium/workspaces/contract";
import { workspaces } from "@widgetarium/workspaces/contract";
import { WorkspaceGlyph } from "../workspace-glyph/workspace-glyph.js";
import { WorkspaceLook } from "../workspace-look/workspace-look.js";

const MENU_LABEL = "Workspaces";
const NAME_AND_ICON = "Name and icon";
const NEW_WORKSPACE = "New workspace";
const ITEM_ICON_PX = 16;

export function WorkspaceSubmenu({ shown }: { readonly shown: WorkspacesView }): ReactNode {
	const menu = useControlMenu();
	const [isEditing, setEditing] = useState(false);
	const openWorkspace = useCommand(workspaces.workspaces.open);
	const createWorkspace = useCommand(workspaces.workspaces.createWorkspace);
	const chose = (run: () => void) => () => {
		menu.close();
		run();
	};
	if (isEditing) {
		return <WorkspaceLook workspace={shown.current} />;
	}

	return (
		<div role="menu" aria-label={MENU_LABEL} className="sumi-ws-submenu-list" data-ws-menu="">
			{shown.rows.map((row) => (
				<PopoverItem
					key={row.id}
					role="menuitemradio"
					checked={row.isCurrent}
					className="sumi-ws-submenu-row"
					onClick={chose(() => void openWorkspace.run({ id: row.id }))}
				>
					<span className="sumi-ws-submenu-glyph" aria-hidden="true">
						<WorkspaceGlyph icon={row.icon} />
					</span>
					<span className="sumi-ws-submenu-name">{row.name}</span>
					{row.keyHint === null ? null : <span className="sumi-ws-submenu-key">{row.keyHint}</span>}
				</PopoverItem>
			))}
			<PopoverSeparator />
			<PopoverItem role="menuitem" className="sumi-ws-submenu-row" data-ws-item="look" onClick={() => setEditing(true)}>
				<span className="sumi-ws-submenu-glyph" aria-hidden="true">
					<Icon name="pencil" size={ITEM_ICON_PX} />
				</span>
				<span className="sumi-ws-submenu-name">{NAME_AND_ICON}</span>
			</PopoverItem>
			<PopoverItem
				role="menuitem"
				className="sumi-ws-submenu-row"
				data-ws-item="new"
				onClick={chose(() => void createWorkspace.run())}
			>
				<span className="sumi-ws-submenu-glyph" aria-hidden="true">
					<Icon name="plus" size={ITEM_ICON_PX} />
				</span>
				<span className="sumi-ws-submenu-name">{NEW_WORKSPACE}</span>
			</PopoverItem>
		</div>
	);
}
