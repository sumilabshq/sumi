import { fileSystem, terminal } from "@sumi/contract";
import { AuthenticatedGuard, Device, module } from "@widgetarium/data-framework";
import { agentToolsPartsOn } from "./gateways/agent-tools-parts/agent-tools-parts.gateway.js";

export const agentTools = module("agent-tools")
	.on(Device)
	.imports(fileSystem, terminal)
	.guard(AuthenticatedGuard)
	.provide(() => agentToolsPartsOn());
