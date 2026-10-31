import { createElement as h, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { FailAppVersionCommand } from "@widgetarium/app-installer";
import { useCommand } from "@widgetarium/core/requests";
import { AppFrameFleet, READY_TIMEOUT_MS } from "../../lib/app-frame-fleet.js";
import { AppFramesContext } from "../../lib/app-frames-context.js";
import { useFleetFollowsDocument } from "../../lib/use-fleet-follows-document.js";
import { useFleetFollowsInstalled } from "../../lib/use-fleet-follows-installed.js";

export interface AppFramesProviderProps {
	readonly readyTimeoutMs?: number;
	readonly children: ReactNode;
}

export function AppFramesProvider({
	readyTimeoutMs = READY_TIMEOUT_MS,
	children,
}: AppFramesProviderProps): ReactElement {
	const failVersion = useCommand(FailAppVersionCommand);
	const [fleet] = useState(
		() =>
			new AppFrameFleet({
				fail: (failed) => failVersion.run(failed),
				onProblem: (reason) => console.error(`[widgetarium] app frames: ${reason}`),
				readyTimeoutMs,
			}),
	);
	useFleetFollowsInstalled(fleet);
	useFleetFollowsDocument(fleet);
	return <AppFramesContext.Provider value={fleet}>{children}</AppFramesContext.Provider>;
}
