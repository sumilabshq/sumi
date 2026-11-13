import type { McpConfig } from "../../shared/host/mcp.host.js";
import { ConfiguredMcpServersGateway } from "../mcp-servers/configured.gateway.js";
import type { McpServersGateway } from "../mcp-servers/mcp-servers.gateway.js";

export type McpParts = {
	readonly mcpServers: McpServersGateway;
};

export function mcpPartsOn({ config }: { readonly config: McpConfig }): McpParts {
	return {
		mcpServers: new ConfiguredMcpServersGateway(config),
	};
}
