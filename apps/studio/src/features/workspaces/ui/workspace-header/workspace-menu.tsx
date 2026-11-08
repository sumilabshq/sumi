import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, PopoverItem, PopoverSeparator } from "@widgetarium/kit";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { WorkspaceGlyph } from "../workspace-glyph/workspace-glyph.js";
import { workspaces } from "@widgetarium/workspaces/contract";

const MENU_LABEL = "Workspaces";
const NAME_AND_ICON = "Name and icon…";
const NEW_WORKSPACE = "New workspace";
const ITEM_ICON_PX = 18;

export interface WorkspaceMenuProps {
	readonly onChosen: () => void;
	readonly onNameAndIcon: () => void;
}

export function WorkspaceMenu({ onChosen, onNameAndIcon }: WorkspaceMenuProps): ReactElement {
	const { current, rows } = useQuery(workspaces.workspaces.all).data;
	const openWorkspace = useCommand(workspaces.workspaces.open);
	const createWorkspace = useCommand(workspaces.workspaces.create);
	const chose = (run: () => void) => () => {
		onChosen();
		run();
	};
	return (
		<div role="menu" aria-label={MENU_LABEL} data-ws-menu="">
			{rows.map((row) => (
				<PopoverItem
					key={row.id}
					role="menuitemradio"
					checked={row.id === current.id}
					onClick={chose(() => void openWorkspace.run({ id: row.id }))}
				>
					<span className="wg-ws-item-glyph">
						<WorkspaceGlyph icon={row.icon} />
					</span>
					<span className="wg-ws-item-text">{row.name}</span>
					{row.keyHint === null ? null : <span className="wg-ws-item-key">{row.keyHint}</span>}
				</PopoverItem>
			))}
			<PopoverSeparator />
			<PopoverItem role="menuitem" onClick={onNameAndIcon} data-ws-item="look">
				<Icon name="pencil" size={ITEM_ICON_PX} />
				{NAME_AND_ICON}
			</PopoverItem>
			<PopoverItem role="menuitem" onClick={chose(() => void createWorkspace.run())} data-ws-item="new">
				<Icon name="plus" size={ITEM_ICON_PX} />
				{NEW_WORKSPACE}
			</PopoverItem>
		</div>
	);
}
