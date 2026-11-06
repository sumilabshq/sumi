import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/framework";
import { Icon, IconButton, tooltipMarks } from "@widgetarium/kit";
import { CreateWorkspaceCommand, WorkspacesQuery } from "@widgetarium/workspaces";
import { useFadesAtEdges } from "../../lib/use-fades-at-edges.js";
import { StripButton } from "./strip-button.js";

const STRIP_LABEL = "Workspaces";
const NEW_WORKSPACE = "New workspace";
const NEW_ICON_PX = 18;
const NEW_WORKSPACE_TIP = tooltipMarks({ said: NEW_WORKSPACE, side: "top", align: "start" });

export function WorkspaceStrip(): ReactElement | null {
	const { rows, hasStrip } = useQuery(WorkspacesQuery).data;
	const createWorkspace = useCommand(CreateWorkspaceCommand);
	const scroller = useRef<HTMLDivElement | null>(null);
	useFadesAtEdges(scroller, rows.length);
	if (!hasStrip) {
		return null;
	}

	return (
		<div className="wg-ws-strip" role="group" aria-label={STRIP_LABEL} data-ws-strip="">
			<div ref={scroller} className="wg-ws-strip-scroll">
				{rows.map((row) => (
					<StripButton key={row.id} row={row} />
				))}
			</div>
			<IconButton
				variant="ghost"
				className="wg-ws-strip-icon is-new"
				label={NEW_WORKSPACE}
				data-running={createWorkspace.isRunning ? "" : undefined}
				onClick={() => void createWorkspace.run()}
				{...NEW_WORKSPACE_TIP}
			>
				<Icon name="plus" size={NEW_ICON_PX} />
			</IconButton>
		</div>
	);
}
