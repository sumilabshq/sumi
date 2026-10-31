import { createElement as h, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { FailAppVersionCommand } from "@widgetarium/app-installer";
import { useCommand } from "@widgetarium/core/requests";
import type { RemoteTransport } from "@widgetarium/core/requests";
import { AppFrameFleet, READY_TIMEOUT_MS } from "../../lib/app-frame-fleet.js";
import { AppFramesContext } from "../../lib/app-frames-context.js";
import { createFrameRelay } from "../../lib/frame-relay.js";
import { FrameRelayContext } from "../../lib/use-frame-port.js";
import { useFleetFollowsDocument } from "../../lib/use-fleet-follows-document.js";
import { useFleetFollowsInstalled } from "../../lib/use-fleet-follows-installed.js";

export interface AppFramesProviderProps {
	readonly core: RemoteTransport;
	readonly readyTimeoutMs?: number;
	readonly children: ReactNode;
}

export function AppFramesProvider({
	core,
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
	const relay = useMemo(() => createFrameRelay(core), [core]);
	useFleetFollowsInstalled(fleet);
	useFleetFollowsDocument(fleet);
	return (
		<AppFramesContext.Provider value={fleet}>
			<FrameRelayContext.Provider value={relay}>{children}</FrameRelayContext.Provider>
		</AppFramesContext.Provider>
	);
}
