import { mcpToolsOf } from "@widgetarium/data-framework";
import type { ContractShape } from "@widgetarium/data-framework";
import type { McpServerListing } from "../../../shared/schema/mcp-server.schema.js";

export function serverListingOf(contract: ContractShape): McpServerListing {
	return {
		name: contract.name,
		kind: "module",
		tools: mcpToolsOf(contract).map(({ name, description }) => ({
			name,
			description: description ?? null,
		})),
	};
}
