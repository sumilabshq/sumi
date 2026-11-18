import { mcp as mcpModule } from "@sumi/mcp/implementation";
import { agents, windows } from "@sumi/sumi-host-plugin";
import { assistant as assistantModule } from "@widgetarium/assistant/implementation";
import type { PromptPart, Runner } from "@widgetarium/assistant/implementation";
import type { McpServer } from "@widgetarium/data-framework";
import { plugin } from "@widgetarium/plugin-framework";
import { agentToolsServeOf } from "./features/serve-mcp/lib/agent-tools-serve.js";
import { hasOwnRuntime, mcpServeOf } from "./features/serve-mcp/lib/serve-mcp.js";
import type { McpServerEntry } from "./features/serve-mcp/lib/serve-mcp.js";

export const agent = plugin("agent")
	.require(windows, agents)
	.apply((app) => {
		const servers: McpServer[] = [];
		const runners: Runner[] = [];
		const promptParts: PromptPart[] = [];
		app.use(windows).module(mcpModule({ servers }));
		app
			.use(windows)
			.serverModule(({ assistant }) => assistantModule({ ...assistant, runners, mcpServers: servers, promptParts }));
		app.use(agents).mcpServer(agentToolsServeOf(servers));
		return {
			addRunner: (runner: Runner): void => {
				runners.push(runner);
			},
			addPromptPart: (part: PromptPart): void => {
				promptParts.push(part);
			},
			mcp: {
				addServer: (entry: McpServerEntry): void => {
					for (const module of hasOwnRuntime(entry) ? [] : entry.modules) {
						app.use(windows).module(module);
					}

					app.use(agents).mcpServer(mcpServeOf(entry, servers));
				},
			},
		};
	});
