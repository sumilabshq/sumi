import { Device, module } from "@widgetarium/data-framework";
import { workspacesPartsOn } from "./gateways/workspaces-parts/workspaces-parts.gateway.js";
import type { WorkspacesConfig } from "./shared/host/workspaces.host.js";
import { chatFacts } from "@sumi/chat-facts/contract";

export const workspaces = module("workspaces")
	.on(Device)
	.imports(chatFacts)
	.config<WorkspacesConfig>()
	.provide((facts) => workspacesPartsOn(facts));
