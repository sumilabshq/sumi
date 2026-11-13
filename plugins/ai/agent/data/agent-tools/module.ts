import { fileSystem, terminal } from "@sumi/contract";
import { AuthenticatedGuard, Device, module } from "@widgetarium/data-framework";
import { agentToolsPartsOn } from "./gateways/agent-tools-parts/agent-tools-parts.gateway.js";
import type { AgentToolsConfig } from "./shared/host/agent-tools.host.js";

export type { AgentToolsConfig } from "./shared/host/agent-tools.host.js";

export const agentTools = module("agent-tools")
	.on(Device)
	.imports(fileSystem, terminal)
	.guard(AuthenticatedGuard)
	.config<AgentToolsConfig>()
	.provide((facts) => agentToolsPartsOn(facts));
