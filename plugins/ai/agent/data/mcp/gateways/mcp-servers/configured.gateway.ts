import type { McpServer } from "@widgetarium/data-framework";
import type { McpConfig } from "../../shared/host/mcp.host.js";
import { McpServersGateway } from "./mcp-servers.gateway.js";

export class ConfiguredMcpServersGateway extends McpServersGateway {
	constructor(private readonly config: McpConfig) {
		super();
	}

	servers(): readonly McpServer[] {
		return this.config.servers;
	}
}
