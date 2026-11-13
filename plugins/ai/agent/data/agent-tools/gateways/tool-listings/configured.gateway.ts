import type { McpServer } from "@widgetarium/data-framework";
import type { AgentToolsConfig } from "../../shared/host/agent-tools.host.js";
import { ToolListingsGateway } from "./tool-listings.gateway.js";

export class ConfiguredToolListingsGateway extends ToolListingsGateway {
	constructor(private readonly config: AgentToolsConfig) {
		super();
	}

	servers(): readonly McpServer[] {
		return this.config.servers;
	}
}
