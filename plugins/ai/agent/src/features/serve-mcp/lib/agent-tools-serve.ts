import { agentTools } from "@sumi/agent-tools/implementation";
import { fileSystem, terminal } from "@sumi/contract";
import type { WindowOffers } from "@sumi/sumi-host-plugin";
import { runtime } from "@widgetarium/data-framework";
import type { McpServer, RemoteTransport } from "@widgetarium/data-framework";
import { servedMcpOf } from "./serve-mcp.js";

const AGENT_TOOLS_SERVER = "agent-tools";
const APP_CALLER_HEADER = "x-sumi-app";
const AGENT_APP = "agent";

// TODO: the runtime is never stopped; it lives as long as its window
export function agentToolsServeOf(servers: McpServer[]): (offers: WindowOffers) => McpServer {
	return ({ core, platform, workspaceId }) => {
		const asAgent = calledAsAgent(core);
		const tools = runtime()
			.modules(agentTools({ servers }))
			.imports(fileSystem({ over: asAgent }), terminal({ over: asAgent }))
			.start({ platform, scope: { workspaceId } });
		const server = servedMcpOf(tools, AGENT_TOOLS_SERVER, [agentTools.definition.name]);
		servers.push(server);
		return server;
	};
}

// TRADE-OFF: the header name is copied from the studio, which a plugin cannot import
function calledAsAgent(core: RemoteTransport): RemoteTransport {
	return {
		call: (call) => {
			const headers = new Headers(call.headers);
			headers.set(APP_CALLER_HEADER, AGENT_APP);
			return core.call({ ...call, headers });
		},
		changes: (hear) => core.changes(hear),
	};
}
