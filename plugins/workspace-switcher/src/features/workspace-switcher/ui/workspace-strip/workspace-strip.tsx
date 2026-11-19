import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { Icon, IconButton, tooltipMarks } from "@widgetarium/kit";
import { workspaces } from "@widgetarium/workspaces/contract";
import { useFadesAtEdges } from "../../lib/use-fades-at-edges.js";
import { StripButton } from "./strip-button.js";
import type { StripPlace } from "./strip-button.js";

const STRIP_LABEL = "Workspaces";
const NEW_WORKSPACE = "New workspace";
const NEW_ICON_PX = 18;
const NEW_WORKSPACE_TIP = tooltipMarks({ said: NEW_WORKSPACE, side: "top", align: "start" });

export function workspaceStripAt(place: StripPlace): () => ReactElement | null {
	return function PlacedWorkspaceStrip(): ReactElement | null {
		return <WorkspaceStrip place={place} />;
	};
}

function WorkspaceStrip({ place }: { readonly place: StripPlace }): ReactElement | null {
	const shown = useOptionalQuery(workspaces.workspaces.all).data ?? null;
	const scroller = useRef<HTMLDivElement | null>(null);
	useFadesAtEdges(scroller, shown?.rows.length ?? 0);
	if (shown === null || !shown.hasStrip) {
		return null;
	}

	return (
		<div className={`sumi-ws-strip is-${place}`} role="group" aria-label={STRIP_LABEL} data-ws-strip={place}>
			<div ref={scroller} className="sumi-ws-strip-scroll">
				{shown.rows.map((row) => (
					<StripButton key={row.id} row={row} place={place} />
				))}
			</div>
			{place === "sidebar" ? <NewWorkspaceButton /> : null}
		</div>
	);
}

function NewWorkspaceButton(): ReactElement {
	const createWorkspace = useCommand(workspaces.workspaces.createWorkspace);
	return (
		<IconButton
			variant="ghost"
			className="sumi-ws-strip-icon is-new"
			label={NEW_WORKSPACE}
			data-running={createWorkspace.isRunning ? "" : undefined}
			onClick={() => void createWorkspace.run()}
			{...NEW_WORKSPACE_TIP}
		>
			<Icon name="plus" size={NEW_ICON_PX} />
		</IconButton>
	);
}
