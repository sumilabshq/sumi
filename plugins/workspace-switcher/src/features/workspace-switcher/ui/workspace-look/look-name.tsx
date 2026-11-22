import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { Input } from "@widgetarium/kit";
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
			<Input
				className="sumi-ws-look-name"
				variant="filled"
				value={typed}
				aria-label={NAME_LABEL}
				autoFocus
				spellCheck={false}
				onValueChange={typedName}
				onBlur={() => setTyped(workspace.name)}
			/>
		</div>
	);
}
