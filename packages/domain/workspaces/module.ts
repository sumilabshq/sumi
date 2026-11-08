import { Device, module } from "@widgetarium/data-framework";
import { places } from "@widgetarium/places";
import { workspacesPartsOn } from "./gateways/workspaces-parts/workspaces-parts.gateway.js";
import type { WorkspacesConfig } from "./shared/host/workspaces.host.js";
import { handled } from "./generated/handled.js";

export const workspaces = module()
	.on(Device)
	.imports(places)
	.config<WorkspacesConfig>()
	.provide((facts) => workspacesPartsOn(facts))
	.handles(handled);
