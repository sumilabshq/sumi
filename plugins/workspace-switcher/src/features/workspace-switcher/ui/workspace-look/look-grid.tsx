import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button } from "@widgetarium/kit";
import { useCommand } from "@widgetarium/data-framework";
import type { WorkspaceRow } from "@widgetarium/workspaces/contract";
import { workspaces } from "@widgetarium/workspaces/contract";
import { iconChoicesOf } from "../../lib/icon-choices.js";
import { WorkspaceGlyph } from "../workspace-glyph/workspace-glyph.js";

const ICONS_LABEL = "Icons";
const NOTHING_FOUND = "Nothing matches";

export interface LookGridProps {
	readonly workspace: WorkspaceRow;
	readonly typed: string;
}

export function LookGrid({ workspace, typed }: LookGridProps): ReactElement {
	const setIcon = useCommand(workspaces.workspaces.setIcon);
	const choices = iconChoicesOf(typed);
	if (choices.length === 0) {
		return <p className="sumi-ws-look-none">{NOTHING_FOUND}</p>;
	}

	return (
		<div className="sumi-ws-look-grid" role="listbox" aria-label={ICONS_LABEL}>
			{choices.map(({ name, words }) => (
				<Button
					shape="square"
					key={name}
					emphasis="ghost"
					size="sm"
					role="option"
					label={words}
					aria-selected={workspace.icon?.kind === "icon" && workspace.icon.name === name}
					className="sumi-ws-look-cell"
					onClick={() => void setIcon.run({ id: workspace.id, icon: { kind: "icon", name } })}
				>
					<WorkspaceGlyph icon={{ kind: "icon", name }} />
				</Button>
			))}
		</div>
	);
}
