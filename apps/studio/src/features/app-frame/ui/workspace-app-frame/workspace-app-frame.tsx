import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { HeldTab } from "@widgetarium/app-host";
import { useQuery } from "@widgetarium/core/requests";
import { WorkspacesQuery } from "@widgetarium/workspaces";
import { AppFrame } from "../app-frame/app-frame.js";

export interface WorkspaceAppFrameProps {
	readonly app: string;
	readonly tab: HeldTab;
	readonly isShown: boolean;
}

export function WorkspaceAppFrame({ app, tab, isShown }: WorkspaceAppFrameProps): ReactElement {
	const { id, name } = useQuery(WorkspacesQuery).data.current;

	return (
		<AppFrame
			app={app}
			tabId={tab.id}
			address={tab.address ?? ""}
			workspace={{
				id,
				name,
			}}
			isShown={isShown}
		/>
	);
}
