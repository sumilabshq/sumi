import { Anywhere, PublicGuard, module } from "@widgetarium/data-framework";
import { mcpPartsOn } from "./gateways/mcp-parts/mcp-parts.gateway.js";
import type { McpConfig } from "./shared/host/mcp.host.js";

export type { McpConfig } from "./shared/host/mcp.host.js";

export const mcp = module("mcp")
	.on(Anywhere)
	.guard(PublicGuard)
	.config<McpConfig>()
	.provide((facts) => mcpPartsOn(facts));
