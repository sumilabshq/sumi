import { prefixedModule, runtime } from "@widgetarium/data-framework";
import type { RemoteModule, RemoteTransport } from "@widgetarium/data-framework";
import type { BackgroundModule, HostServer } from "../plugins/sumi-plugins.js";
import { HOST_CAPABILITY_CONTRACTS } from "./studio-app.js";

export interface BackendServersAsk {
	readonly workspaceId: string;
	readonly core: RemoteTransport;
	readonly backgroundModules: readonly BackgroundModule[];
	readonly servers: readonly HostServer[];
}

interface ServerStart {
	readonly workspaceId: string;
	readonly imports: readonly RemoteModule[];
}

const SERVING = "[studio-core] workspace {workspace}: server {server} none → serving {count} modules";
const NOT_SERVING = "[studio-core] workspace {workspace}: server {server} none → failed; the core runs on";

export function startBackendServers({ workspaceId, core, backgroundModules, servers }: BackendServersAsk): void {
	const imports = [
		...HOST_CAPABILITY_CONTRACTS.map((contract) => contract({ over: core })),
		...backgroundModules.map(({ contract, prefix }) => contract({ over: core, prefix })),
	];

	for (const server of servers) {
		startServerOrReport(server, { workspaceId, imports });
	}
}

function startServerOrReport(server: HostServer, { workspaceId, imports }: ServerStart): void {
	const said = { workspace: workspaceId, server: server.name };

	try {
		const started = runtime()
			.modules(...server.modules.map((module) => prefixedModule(module, server.prefix)))
			.imports(...imports)
			.start({
				platform: "server",
				env: {},
				scope: { workspaceId },
			});
		server.serve(started);
		console.info(
			SERVING.replace("{workspace}", said.workspace)
				.replace("{server}", said.server)
				.replace("{count}", String(server.modules.length)),
		);
	} catch (failure) {
		console.error(NOT_SERVING.replace("{workspace}", said.workspace).replace("{server}", said.server), failure);
	}
}
