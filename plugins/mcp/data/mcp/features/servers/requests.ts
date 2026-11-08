import { query } from "#module";
import { McpServerListingsSchema } from "../../shared/schema/mcp-server.schema.js";
import { serverListingOf } from "./lib/server-listing.js";

export const mcpServers = query()
	.public()
	.metadata({ description: "The MCP servers this workspace serves, each with the tools it offers." })
	.output(McpServerListingsSchema)
	.settlesNow()
	.handle((_input, { mcpServers: mcpServersGateway }) => mcpServersGateway.servedContracts().map(serverListingOf));
