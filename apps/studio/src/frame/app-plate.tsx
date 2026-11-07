import { createElement as h } from "react";
import type { ReactElement } from "react";
import { RuntimeProvider } from "@widgetarium/data-framework";
import type { Runtime } from "@widgetarium/data-framework";
import { WorkspaceAppPlate } from "./workspace-app-plate.js";
import type { WorkspaceAppPlateProps } from "./workspace-app-plate.js";

export interface AppPlateProps extends WorkspaceAppPlateProps {
	readonly workspaces: Runtime;
}

export function AppPlate({ workspaces, ...plate }: AppPlateProps): ReactElement {
	return (
		<RuntimeProvider runtime={workspaces}>
			<WorkspaceAppPlate {...plate} />
		</RuntimeProvider>
	);
}
