import { createElement as h, memo, useState } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { IconButton, Popover, PopoverAnchor, PopoverContent, tooltipMarks } from "@widgetarium/kit";
import type { WorkspaceRow } from "@widgetarium/workspaces/contract";
import { workspaces } from "@widgetarium/workspaces/contract";
import { WorkspaceGlyph } from "../workspace-glyph/workspace-glyph.js";
import { WorkspaceLook } from "../workspace-look/workspace-look.js";

export type StripPlace = "sidebar" | "header";

const LOOK_GAP_PX = 6;

export const StripButton = memo(function StripButton({
	row,
	place,
}: {
	readonly row: WorkspaceRow;
	readonly place: StripPlace;
}): ReactElement {
	const openWorkspace = useCommand(workspaces.workspaces.open);
	const [isEditing, setEditing] = useState(false);
	const side = place === "sidebar" ? "top" : "bottom";
	return (
		<Popover open={isEditing} onOpenChange={setEditing} isPortaled>
			<PopoverAnchor asChild>
				<IconButton
					variant="ghost"
					className="sumi-ws-strip-icon"
					label={row.name}
					aria-current={row.isCurrent ? "true" : undefined}
					data-opening={row.isOpening ? "" : undefined}
					data-ws-strip-id={row.id}
					onClick={() => void openWorkspace.run({ id: row.id })}
					onContextMenu={(event) => {
						event.preventDefault();
						setEditing(true);
					}}
					{...tooltipMarks({ said: row.name, keys: row.keyHint, side, align: "start" })}
				>
					<WorkspaceGlyph icon={row.icon} />
				</IconButton>
			</PopoverAnchor>
			<PopoverContent side={side} align="start" sideOffset={LOOK_GAP_PX} className="sumi-ws-look-pop">
				<WorkspaceLook workspace={row} />
			</PopoverContent>
		</Popover>
	);
});
