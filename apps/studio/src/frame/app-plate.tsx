import { createElement as h } from "react";
import type { ReactElement } from "react";
import { AppProvider } from "@widgetarium/data-framework";
import type { StartedApp } from "@widgetarium/data-framework";
import { WorkspaceAppPlate } from "./workspace-app-plate.js";
import type { WorkspaceAppPlateProps } from "./workspace-app-plate.js";

export interface AppPlateProps extends WorkspaceAppPlateProps {
	readonly workspaces: StartedApp;
}

export function AppPlate({ workspaces, ...plate }: AppPlateProps): ReactElement {
	return (
		<AppProvider app={workspaces}>
			<WorkspaceAppPlate {...plate} />
		</AppProvider>
	);
}
