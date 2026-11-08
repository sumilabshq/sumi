import { mcpServerOf } from "@widgetarium/data-framework";
import type { McpServer, Runtime } from "@widgetarium/data-framework";

const SERVING = "[mcp] {server}: none → serving {count} tools";

export function serveMcpInto(servers: McpServer[], name: string): (runtime: Runtime) => void {
	return (runtime) => {
		// TODO: hand the server to the agent's MCP relay; today it is only listed
		const server = mcpServerOf(runtime, { name });
		servers.push(server);
		console.info(SERVING.replace("{server}", name).replace("{count}", String(server.tools.length)));
	};
}
