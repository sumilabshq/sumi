import { mcp as mcpModule } from "@sumi/mcp/implementation";
import { agents, windows } from "@sumi/sumi-host-plugin";
import type { McpServer } from "@widgetarium/data-framework";
import { plugin } from "@widgetarium/plugin-framework";
import { mcpServeOf } from "./features/serve-mcp/lib/serve-mcp.js";
import type { McpServerEntry } from "./features/serve-mcp/lib/serve-mcp.js";

export const mcp = plugin("mcp")
	.require(windows, agents)
	.apply((app) => {
		const servers: McpServer[] = [];
		app.use(windows).module(mcpModule({ servers }));
		return {
			server: (entry: McpServerEntry): void => {
				for (const module of entry.modules) {
					app.use(windows).module(module);
				}

				app.use(agents).mcpServer(mcpServeOf(entry, servers));
			},
		};
	});
