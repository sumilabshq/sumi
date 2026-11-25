import { prefixedModule, runtime } from "@widgetarium/data-framework";
import type { RemoteModule, RemoteTransport, Runtime } from "@widgetarium/data-framework";
import type { BackgroundModule, HostServer } from "../plugins/sumi-plugins.js";

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
	const imports = backgroundModules.map(({ contract, prefix }) => contract({ over: core, prefix }));

	for (const server of servers) {
		startServerOrReport(server, { workspaceId, imports });
	}
}

function startServerOrReport(server: HostServer, { workspaceId, imports }: ServerStart): void {
	const said = { workspace: workspaceId, server: server.name };

	try {
		server.serve(startedServer(server, { workspaceId, imports }));
		console.info(
			SERVING.replace("{workspace}", said.workspace)
				.replace("{server}", said.server)
				.replace("{count}", String(server.modules.length)),
		);
	} catch (failure) {
		console.error(NOT_SERVING.replace("{workspace}", said.workspace).replace("{server}", said.server), failure);
	}
}

function startedServer(server: HostServer, { workspaceId, imports }: ServerStart): Runtime {
	return runtime()
		.modules(...server.modules.map((module) => prefixedModule(module, server.prefix)))
		.imports(...imports)
		.start({
			platform: "server",
			env: {},
			scope: { workspaceId },
		});
}
