import { createElement as h } from "react";
import type { ReactElement } from "react";
import { IconButton } from "@widgetarium/kit";
import { useCommand } from "@widgetarium/core/requests";
import { WorkspaceGlyph } from "../../../../shared/ui/workspace-glyph/workspace-glyph.js";
import type { WorkspaceRow } from "../../../../shared/schema/workspace.schema.js";
import { SetWorkspaceIconCommand } from "../../contract.js";
import { isChosen, lookChoicesOf } from "../../lib/look-choices.js";
import type { LookTab } from "../../lib/look-choices.js";
import { LookNone } from "./look-none.js";

export interface LookGridProps {
	readonly workspace: WorkspaceRow;
	readonly tab: LookTab;
	readonly typed: string;
}

export function LookGrid({ workspace, tab, typed }: LookGridProps): ReactElement {
	const setIcon = useCommand(SetWorkspaceIconCommand);
	const choices = lookChoicesOf(tab, typed);
	if (choices.length === 0) {
		return <LookNone />;
	}

	return (
		<div className={`wg-ws-pick-grid is-${tab}`} role="listbox" aria-label={tab}>
			{choices.map((choice) => (
				<IconButton
					key={choice.key}
					variant="ghost"
					role="option"
					label={choice.words}
					aria-selected={isChosen(choice, workspace.icon)}
					className="wg-ws-pick-cell"
					onClick={() => void setIcon.run({ id: workspace.id, icon: choice.icon })}
				>
					<WorkspaceGlyph icon={choice.icon} />
				</IconButton>
			))}
		</div>
	);
}
