import { agentTools } from "@sumi/agent-tools/implementation";
import { fileSystem, terminal } from "@sumi/contract";
import type { WindowOffers } from "@sumi/sumi-host-plugin";
import { runtime } from "@widgetarium/data-framework";
import type { McpServer } from "@widgetarium/data-framework";
import { calledAsAgent } from "./called-as-agent.js";
import { servedMcpOf } from "./serve-mcp.js";

const AGENT_TOOLS_SERVER = "agent-tools";

// TODO: the runtime is never stopped; it lives as long as its window
export function agentToolsServeOf(servers: McpServer[]): (offers: WindowOffers) => McpServer {
	return ({ core, platform, workspaceId }) => {
		const asAgent = calledAsAgent(core);
		const tools = runtime()
			.modules(agentTools)
			.imports(fileSystem({ over: asAgent }), terminal({ over: asAgent }))
			.start({ platform, scope: { workspaceId } });
		const server = servedMcpOf(tools, AGENT_TOOLS_SERVER, [agentTools.definition.name]);
		servers.push(server);
		return server;
	};
}
