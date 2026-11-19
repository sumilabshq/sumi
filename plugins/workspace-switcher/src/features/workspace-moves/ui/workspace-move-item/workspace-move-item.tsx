import { createElement as h, useState } from "react";
import type { ReactNode } from "react";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { Icon, Popover, PopoverAnchor, PopoverContent, PopoverItem } from "@widgetarium/kit";
import { appHost } from "@widgetarium/app-host/contract";
import { workspaces } from "@widgetarium/workspaces/contract";
import { WorkspaceGlyph } from "../../../workspace-switcher/ui/workspace-glyph/workspace-glyph.js";

export interface MovedEntry {
	readonly kind: "tab" | "group";
	readonly id: string;
}

export interface WorkspaceMoveItemProps {
	readonly entry: MovedEntry;
	readonly onDone: () => void;
}

const MOVE_TO_WORKSPACE = "Move to workspace";
const MENU_LABEL = "Workspaces to move to";
const ITEM_ICON_PX = 16;
const CHEVRON_PX = 14;
const SUBMENU_GAP_PX = 4;

export function WorkspaceMoveItem({ entry, onDone }: WorkspaceMoveItemProps): ReactNode {
	const shown = useOptionalQuery(workspaces.workspaces.all).data ?? null;
	const moveToWorkspace = useCommand(appHost.tabActions.moveToWorkspace);
	const [isOpen, setOpen] = useState(false);

	if (shown === null) {
		return null;
	}

	const others = shown.rows.filter((row) => !row.isCurrent);
	return (
		<Popover open={isOpen} onOpenChange={setOpen} isPortaled>
			<PopoverAnchor asChild>
				<PopoverItem
					role="menuitem"
					aria-haspopup="menu"
					aria-expanded={isOpen}
					disabled={others.length === 0}
					className="sumi-ws-move-row"
					data-ws-move={entry.kind}
					onClick={() => setOpen(true)}
				>
					<Icon name="folder-output" size={ITEM_ICON_PX} />
					<span className="sumi-ws-move-name">{MOVE_TO_WORKSPACE}</span>
					<span className="sumi-ws-move-chevron" aria-hidden="true">
						<Icon name="chevron-right" size={CHEVRON_PX} />
					</span>
				</PopoverItem>
			</PopoverAnchor>
			<PopoverContent side="right" align="start" sideOffset={SUBMENU_GAP_PX} className="sumi-ws-move-menu">
				<div role="menu" aria-label={MENU_LABEL} className="sumi-ws-move-list">
					{others.map((row) => (
						<PopoverItem
							key={row.id}
							role="menuitem"
							className="sumi-ws-move-row"
							data-ws-move-to={row.id}
							onClick={() => {
								setOpen(false);
								onDone();
								void moveToWorkspace.run({ entry, workspace: row.id });
							}}
						>
							<span className="sumi-ws-move-glyph" aria-hidden="true">
								<WorkspaceGlyph icon={row.icon} />
							</span>
							<span className="sumi-ws-move-name">{row.name}</span>
						</PopoverItem>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}
