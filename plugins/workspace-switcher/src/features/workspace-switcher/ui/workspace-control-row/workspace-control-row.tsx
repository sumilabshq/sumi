import { Fragment, createElement as h, useState } from "react";
import type { ReactNode } from "react";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { Icon, Popover, PopoverAnchor, PopoverContent, PopoverItem, PopoverSeparator } from "@widgetarium/kit";
import { workspaces } from "@widgetarium/workspaces/contract";
import { WorkspaceGlyph } from "../workspace-glyph/workspace-glyph.js";
import { WorkspaceSubmenu } from "./workspace-submenu.js";

const WORKSPACE = "Workspace: {name}";
const CHEVRON_PX = 14;
const SUBMENU_GAP_PX = 8;

export function WorkspaceControlRow(): ReactNode {
	const shown = useOptionalQuery(workspaces.workspaces.all).data ?? null;
	const [isOpen, setOpen] = useState(false);
	if (shown === null) {
		return null;
	}

	return (
		<>
			<Popover open={isOpen} onOpenChange={setOpen} isPortaled>
				<PopoverAnchor asChild>
					<PopoverItem
						role="menuitem"
						aria-haspopup="menu"
						aria-expanded={isOpen}
						className="sumi-control-menu-row sumi-ws-control-row"
						data-ws-control=""
						onClick={() => setOpen(true)}
					>
						<span className="sumi-control-menu-row-icon sumi-ws-control-glyph" aria-hidden="true">
							<WorkspaceGlyph icon={shown.current.icon} />
						</span>
						<span className="sumi-control-menu-row-label">{WORKSPACE.replace("{name}", shown.current.name)}</span>
						<span className="sumi-control-menu-row-keys" aria-hidden="true">
							<Icon name="chevron-right" size={CHEVRON_PX} />
						</span>
					</PopoverItem>
				</PopoverAnchor>
				<PopoverContent side="left" align="start" sideOffset={SUBMENU_GAP_PX} className="sumi-ws-submenu">
					<WorkspaceSubmenu shown={shown} />
				</PopoverContent>
			</Popover>
			<PopoverSeparator />
		</>
	);
}
