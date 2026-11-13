import type { McpServer } from "@widgetarium/data-framework";

export abstract class ToolListingsGateway {
	abstract servers(): readonly McpServer[];
}
