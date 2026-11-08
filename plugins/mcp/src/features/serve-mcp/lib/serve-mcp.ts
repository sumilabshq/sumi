import { mcpServerOf } from "@widgetarium/data-framework";
import type { ServedModule } from "@sumi/sumi-host-plugin";

const SERVING = "[mcp] {module}: none → serving {count} tools";

export function serveMcp({ runtime, module }: ServedModule): void {
	// TODO: hand the server to the agent's MCP relay; today it only mounts and lists
	const server = mcpServerOf(runtime, { module });
	console.info(SERVING.replace("{module}", module).replace("{count}", String(server.tools.length)));
}
