import { mcpServerOf } from "@widgetarium/data-framework";
import type { DeviceModule, McpServer, Runtime } from "@widgetarium/data-framework";
import type { WindowOffers } from "@sumi/sumi-host-plugin";
import { AgentCallAuthenticate } from "./agent-call-authenticate.js";

export interface McpServerEntry {
	readonly name: string;
	readonly modules: readonly DeviceModule[];
}

const SERVER_NAME = /^[a-z][a-z0-9-]*$/;
const BAD_SERVER_NAME = "MCP server {server}: a name is lowercase letters, digits and -, so agents can allow it";
const SERVING = "[mcp] {server}: none → serving {count} tools";

// TODO: a plugin under an alias prefixes its modules, and the module filter misses them
export function mcpServeOf(entry: McpServerEntry, servers: McpServer[]): (offers: WindowOffers) => McpServer {
	if (!SERVER_NAME.test(entry.name)) {
		throw new Error(BAD_SERVER_NAME.replace("{server}", entry.name));
	}

	const moduleNames = entry.modules.map((module) => module.definition.name);
	return ({ windowApp }) => {
		const server = servedMcpOf(windowApp, entry.name, moduleNames);
		servers.push(server);
		return server;
	};
}

function servedMcpOf(windowApp: Runtime, name: string, modules: readonly string[]): McpServer {
	const server = mcpServerOf(windowApp, { name, modules, authenticate: new AgentCallAuthenticate() });
	console.info(SERVING.replace("{server}", name).replace("{count}", String(server.tools.length)));
	return server;
}
