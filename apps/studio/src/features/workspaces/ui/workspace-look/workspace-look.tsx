import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { Button, Icon } from "@widgetarium/kit";
import { useCommand } from "@widgetarium/framework";
import type { WorkspaceRow } from "@widgetarium/workspaces";
import { SetWorkspaceIconCommand } from "@widgetarium/workspaces";
import { tabOf } from "../../lib/look-choices.js";
import type { LookTab } from "../../lib/look-choices.js";
import { LookGrid } from "./look-grid.js";
import { LookName } from "./look-name.js";

const LOOK_LABEL = "Workspace icon";
const REMOVE_ICON = "Remove icon";
const SEARCH_ICON_PX = 15;
const TABS: ReadonlyArray<readonly [LookTab, string, string]> = [
	["icon", "Icons", "Search icons"],
	["emoji", "Emojis", "Search emojis"],
];

export function WorkspaceLook({ workspace }: { readonly workspace: WorkspaceRow }): ReactElement {
	const [tab, setTab] = useState<LookTab>(tabOf(workspace.icon));
	const [typed, setTyped] = useState("");
	const setIcon = useCommand(SetWorkspaceIconCommand);
	const searchSaid = TABS.find(([kind]) => kind === tab)?.[2] ?? "";
	return (
		<div role="group" aria-label={LOOK_LABEL} data-ws-look="">
			<LookName workspace={workspace} />
			<div className="wg-ws-pick-tabs" role="tablist">
				{TABS.map(([kind, said]) => (
					<Button
						key={kind}
						variant="ghost"
						role="tab"
						aria-selected={kind === tab}
						className="wg-ws-pick-tab"
						onClick={() => setTab(kind)}
					>
						{said}
					</Button>
				))}
				<Button
					variant="ghost"
					className="wg-ws-pick-remove"
					onClick={() => void setIcon.run({ id: workspace.id, icon: null })}
				>
					{REMOVE_ICON}
				</Button>
			</div>
			<label className="wg-ws-pick-search">
				<Icon name="search" size={SEARCH_ICON_PX} />
				<input
					type="search"
					value={typed}
					placeholder={searchSaid}
					aria-label={searchSaid}
					onInput={(event) => setTyped(event.currentTarget.value)}
				/>
			</label>
			<LookGrid workspace={workspace} tab={tab} typed={typed} />
		</div>
	);
}
