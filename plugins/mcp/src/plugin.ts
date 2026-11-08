import { mcp as mcpContract } from "@sumi/mcp/contract";
import { mcp as mcpModule } from "@sumi/mcp/implementation";
import { sumiHost } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { serveMcp } from "./features/serve-mcp/lib/serve-mcp.js";
import { mcpModules } from "./slots.js";

export const mcp = plugin("mcp")
	.require(sumiHost)
	.declare(mcpModules)
	.fill(
		sumiHost.backgroundModules.add({
			id: "mcp",
			module: ({ fillsOf }) => mcpModule({ modules: fillsOf(mcpModules).map(({ contract }) => contract) }),
			contract: mcpContract,
		}),
		sumiHost.backgroundModules.addFrom(mcpModules, (items) =>
			items.map(({ id, module, contract }) => ({
				id,
				module,
				contract,
				exposes: [serveMcp],
			})),
		),
	);
