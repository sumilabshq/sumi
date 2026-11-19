import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { Button, Icon } from "@widgetarium/kit";
import { useCommand } from "@widgetarium/data-framework";
import type { WorkspaceRow } from "@widgetarium/workspaces/contract";
import { workspaces } from "@widgetarium/workspaces/contract";
import { LookGrid } from "./look-grid.js";
import { LookName } from "./look-name.js";

const LOOK_LABEL = "Workspace name and icon";
const SEARCH_ICONS = "Search icons";
const REMOVE_ICON = "Remove icon";
const SEARCH_ICON_PX = 15;

export function WorkspaceLook({ workspace }: { readonly workspace: WorkspaceRow }): ReactElement {
	const [typed, setTyped] = useState("");
	const setIcon = useCommand(workspaces.workspaces.setIcon);
	return (
		<div className="sumi-ws-look" role="group" aria-label={LOOK_LABEL} data-ws-look="">
			<LookName workspace={workspace} />
			<div className="sumi-ws-look-find">
				<label className="sumi-ws-look-search">
					<Icon name="search" size={SEARCH_ICON_PX} />
					<input
						type="search"
						value={typed}
						placeholder={SEARCH_ICONS}
						aria-label={SEARCH_ICONS}
						onInput={(event) => setTyped(event.currentTarget.value)}
					/>
				</label>
				<Button
					variant="ghost"
					className="sumi-ws-look-remove"
					disabled={workspace.icon === null}
					data-ws-remove-icon=""
					onClick={() => void setIcon.run({ id: workspace.id, icon: null })}
				>
					{REMOVE_ICON}
				</Button>
			</div>
			<LookGrid workspace={workspace} typed={typed} />
		</div>
	);
}
