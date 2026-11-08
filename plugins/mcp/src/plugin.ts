import { mcp as mcpContract } from "@sumi/mcp/contract";
import { mcp as mcpModule } from "@sumi/mcp/implementation";
import { backend } from "@sumi/sumi-host-plugin";
import type { McpServer, ServerSideModule } from "@widgetarium/data-framework";
import { plugin } from "@widgetarium/plugin-framework";
import { serveMcpInto } from "./features/serve-mcp/lib/serve-mcp.js";

export const mcp = plugin("mcp")
	.require(backend)
	.apply((app) => {
		const tools: ServerSideModule[] = [];
		const servers: McpServer[] = [];
		app.use(backend).module(mcpModule({ servers }), mcpContract);
		app.use(backend).server({ name: "mcp", modules: tools, serve: serveMcpInto(servers, "mcp") });
		return {
			tools: (modules: readonly ServerSideModule[]): void => {
				tools.push(...modules);
			},
		};
	});
