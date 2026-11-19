import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/data-framework";
import type { WorkspaceRow } from "@widgetarium/workspaces/contract";
import { workspaces } from "@widgetarium/workspaces/contract";
import { WorkspaceGlyph } from "../workspace-glyph/workspace-glyph.js";

const NAME_LABEL = "Workspace name";

export function LookName({ workspace }: { readonly workspace: WorkspaceRow }): ReactElement {
	const [typed, setTyped] = useState(workspace.name);
	const rename = useCommand(workspaces.workspaces.rename);
	const typedName = (name: string): void => {
		setTyped(name);
		if (name.trim() !== "") {
			void rename.run({ id: workspace.id, name });
		}
	};
	return (
		<div className="sumi-ws-look-head">
			<span className="sumi-ws-look-now">
				<WorkspaceGlyph icon={workspace.icon} />
			</span>
			<label className="sumi-ws-look-name">
				<input
					type="text"
					value={typed}
					aria-label={NAME_LABEL}
					autoFocus
					spellCheck={false}
					onInput={(event) => typedName(event.currentTarget.value)}
					onBlur={() => setTyped(workspace.name)}
				/>
			</label>
		</div>
	);
}
