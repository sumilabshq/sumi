import { createElement as h, memo } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/framework";
import { IconButton, tooltipMarks } from "@widgetarium/kit";
import { WorkspaceGlyph } from "../workspace-glyph/workspace-glyph.js";
import type { WorkspaceRow } from "@widgetarium/workspaces";
import { OpenWorkspaceCommand } from "@widgetarium/workspaces";

export const StripButton = memo(function StripButton({ row }: { readonly row: WorkspaceRow }): ReactElement {
	const openWorkspace = useCommand(OpenWorkspaceCommand);
	return (
		<IconButton
			variant="ghost"
			className="wg-ws-strip-icon"
			label={row.name}
			aria-current={row.isCurrent ? "true" : undefined}
			data-opening={row.isOpening ? "" : undefined}
			data-ws-strip-id={row.id}
			onClick={() => void openWorkspace.run({ id: row.id })}
			{...tooltipMarks({ said: row.name, keys: row.keyHint, side: "top", align: "start" })}
		>
			<WorkspaceGlyph icon={row.icon} />
		</IconButton>
	);
});
