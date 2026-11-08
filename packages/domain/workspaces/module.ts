import { Device, module } from "@widgetarium/data-framework";
import { places } from "@widgetarium/places/contract";
import { workspacesPartsOn } from "./gateways/workspaces-parts/workspaces-parts.gateway.js";
import type { WorkspacesConfig } from "./shared/host/workspaces.host.js";

export const workspaces = module("workspaces")
	.on(Device)
	.imports(places)
	.config<WorkspacesConfig>()
	.provide((facts) => workspacesPartsOn(facts));
