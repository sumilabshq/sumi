import { createElement as h } from "react";
import type { ReactElement } from "react";
import { IconButton } from "@widgetarium/kit";
import { useCommand } from "@widgetarium/data-framework";
import type { WorkspaceInk, WorkspaceRow } from "@widgetarium/workspaces/contract";
import { workspaces } from "@widgetarium/workspaces/contract";

const INK_LABEL = "Workspace ink";
const INKS: ReadonlyArray<readonly [WorkspaceInk, string]> = [
	["yellow", "Sumi yellow"],
	["ember", "Ember"],
	["moss", "Moss"],
	["tide", "Tide"],
	["iris", "Iris"],
	["rose", "Rose"],
];

export function InkRow({ workspace }: { readonly workspace: WorkspaceRow }): ReactElement {
	const setInk = useCommand(workspaces.workspaces.setInk);
	return (
		<div className="wg-ws-ink-row" role="radiogroup" aria-label={INK_LABEL}>
			{INKS.map(([ink, label]) => (
				<IconButton
					key={ink}
					variant="ghost"
					role="radio"
					label={label}
					aria-checked={workspace.ink === ink}
					className="wg-ws-ink"
					onClick={() => void setInk.run({ id: workspace.id, ink })}
				>
					<span className={`wg-ws-ink-swatch sumi-ink-${ink}`} aria-hidden="true" />
				</IconButton>
			))}
		</div>
	);
}
