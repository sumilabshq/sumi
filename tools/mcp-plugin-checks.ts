import { localTransport, runtime } from "@widgetarium/data-framework";
import { MemoryPluginStateStore, plugin, runtime as pluginRuntime } from "@widgetarium/plugin-framework";
import type { Plugin } from "@widgetarium/plugin-framework";
import { questions } from "@widgetarium/questions/contract";
import { questions as questionsModule } from "@widgetarium/questions/implementation";
import { mcp as mcpContract } from "@sumi/mcp/contract";
import { StoreClient } from "@widgetarium/behaviors/tauri-store";
import { mcp } from "../plugins/mcp/src/index.ts";
import { backend } from "../plugins/sumi-host/src/index.ts";
import { backendFor, emptyHostRegistrations } from "../apps/studio/src/plugins/host-services.ts";
import type { HostRegistrations } from "../apps/studio/src/plugins/host-services.ts";
import { startBackendServers } from "../apps/studio/src/tabs/backend-servers.ts";
import { FakeStore } from "./host-tauri-fake-store.ts";
import { check, tally } from "./check-helpers.ts";

interface StartedHost {
	readonly registered: HostRegistrations;
	readonly refusals: readonly string[];
	readonly core: ReturnType<ReturnType<typeof runtime>["start"]>;
}

const offers = {
	store: new StoreClient(new FakeStore().invoke),
	file: {
		read: () => Promise.resolve(null),
		write: () => Promise.resolve(),
	},
};

function startedHost(plugins: readonly Plugin[]): StartedHost {
	const registered = emptyHostRegistrations();
	const started = pluginRuntime()
		.builtInPlugins(...plugins)
		.state(new MemoryPluginStateStore(plugins.map(({ id }) => id)))
		.provide(backend, backendFor(registered))
		.start();
	const own = localTransport();
	const core = runtime()
		.modules(...registered.backgroundModules.map(({ moduleOf }) => moduleOf(offers)))
		.start({
			platform: "server",
			env: {},
			scope: { workspaceId: "mcp-plugin-workspace" },
		});
	own.serve(core);
	startBackendServers({
		workspaceId: "mcp-plugin-workspace",
		core: own,
		backgroundModules: registered.backgroundModules,
		servers: registered.servers,
	});
	return {
		registered,
		refusals: started.refusals,
		core,
	};
}

const probe = plugin("probe")
	.require(mcp)
	.apply((app) => {
		app.use(mcp).tools([questionsModule]);
	});
const host = startedHost([mcp, probe]);

check("the plugins start with no refusal", host.refusals, []);
check(
	"the mcp plugin puts its listing module in the backend and asks for one server holding the tools",
	[
		host.registered.backgroundModules.map(({ contract }) => contract.name),
		host.registered.servers.map(({ name, modules }) => [name, modules.length]),
	],
	[["mcp"], [["mcp", 1]]],
);

const listed = await host.core.send(mcpContract.servers.mcpServers);
check(
	"the mcp module lists the running server with the tools of every module in it",
	listed.ok ? listed.output.map(({ name, kind, tools }) => [name, kind, tools.length > 0]) : listed.reason,
	[["mcp", "module", true]],
);
check(
	"a tool is named by its module and its path",
	listed.ok ? listed.output[0]?.tools.some(({ name }) => name === "questions_dock_chat-questions") : listed.reason,
	true,
);

const twice = plugin("twice")
	.require(backend, mcp)
	.apply((app) => {
		app.use(backend).module(questionsModule, questions);
		app.use(mcp).tools([questionsModule]);
	});
const quiet = console.error;
console.error = () => undefined;
const doubled = startedHost([mcp, twice]);
console.error = quiet;
const doubledListing = await doubled.core.send(mcpContract.servers.mcpServers);
check(
	"a module both in the backend and in a server is refused for the server: one owner; the backend still answers",
	doubledListing.ok ? doubledListing.output.length : doubledListing.reason,
	0,
);

if (tally.failed > 0) {
	process.exitCode = 1;
}
