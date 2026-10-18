import type { HostApp } from "@widgetarium/core/engine/studio-host.js";

export abstract class HostAppsGateway {
	abstract apps(): readonly HostApp[];
	abstract watch(changed: () => void): () => void;
}
