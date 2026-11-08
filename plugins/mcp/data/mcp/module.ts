import { PublicGuard, Server, module } from "@widgetarium/data-framework";
import { mcpPartsOn } from "./gateways/mcp-parts/mcp-parts.gateway.js";
import type { McpConfig } from "./shared/host/mcp.host.js";

export type { McpConfig } from "./shared/host/mcp.host.js";

export const mcp = module("mcp")
	.on(Server)
	.guard(PublicGuard)
	.config<McpConfig>()
	.provide((facts) => mcpPartsOn(facts));
