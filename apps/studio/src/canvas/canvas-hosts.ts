import type { HostObject } from "@widgetarium/framework";
import type {
	AgentJobsHost,
	DataAdapterHost,
	DrawingSurfaceHost,
	StartedProjectHost,
	WidgetRegistryHost,
} from "@widgetarium/canvas/module";

type HeldBy<T> = T extends HostObject<infer Held> ? Held : never;

export type VaultCanvasHosts = {
	readonly adapter: HeldBy<typeof DataAdapterHost>;
	readonly registry: HeldBy<typeof WidgetRegistryHost>;
	readonly drawingHost: HeldBy<typeof DrawingSurfaceHost>;
	readonly agentJobs: HeldBy<typeof AgentJobsHost>;
};

export type ProjectCanvasHosts = {
	readonly project: HeldBy<typeof StartedProjectHost>;
};

export type CanvasHosts = VaultCanvasHosts | ProjectCanvasHosts;
