import type { McpServer } from "@widgetarium/data-framework";

export abstract class McpServersGateway {
	abstract servers(): readonly McpServer[];
}
