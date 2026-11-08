import type { McpServer } from "@widgetarium/data-framework";

export interface McpConfig {
	readonly servers: readonly McpServer[];
}
