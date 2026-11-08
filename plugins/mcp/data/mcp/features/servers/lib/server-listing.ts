import type { McpServer } from "@widgetarium/data-framework";
import type { McpServerListing } from "../../../shared/schema/mcp-server.schema.js";

export function serverListingOf({ name, tools }: McpServer): McpServerListing {
	return {
		name,
		kind: "module",
		tools: tools.map((tool) => ({
			name: tool.name,
			description: tool.description ?? null,
		})),
	};
}
