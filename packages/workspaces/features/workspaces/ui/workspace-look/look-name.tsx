import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { WorkspaceGlyph } from "../../../../shared/ui/workspace-glyph/workspace-glyph.js";
import type { WorkspaceRow } from "../../../../shared/schema/workspace.schema.js";
import { RenameWorkspaceCommand } from "../../contract.js";

const NAME_LABEL = "Workspace name";

export function LookName({ workspace }: { readonly workspace: WorkspaceRow }): ReactElement {
	const [typed, setTyped] = useState(workspace.name);
	const rename = useCommand(RenameWorkspaceCommand);
	const typedName = (name: string): void => {
		setTyped(name);
		if (name.trim() !== "") {
			void rename.run({ id: workspace.id, name });
		}
	};
	return (
		<div className="wg-ws-pick-head">
			<span className="wg-ws-pick-now">
				<WorkspaceGlyph icon={workspace.icon} />
			</span>
			<label className="wg-ws-pick-name">
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
