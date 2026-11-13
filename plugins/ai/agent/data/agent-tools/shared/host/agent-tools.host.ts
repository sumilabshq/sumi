import type { McpServer } from "@widgetarium/data-framework";

export interface AgentToolsConfig {
	readonly servers: readonly McpServer[];
}
