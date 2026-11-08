import { runtime } from "@widgetarium/data-framework";
import { MemoryPluginStateStore, plugin, runtime as pluginRuntime } from "@widgetarium/plugin-framework";
import { questions } from "@widgetarium/questions/contract";
import { questions as questionsModule } from "@widgetarium/questions/implementation";
import { mcp as mcpContract } from "@sumi/mcp/contract";
import { StoreClient } from "@widgetarium/behaviors/tauri-store";
import { mcp } from "../plugins/mcp/src/index.ts";
import { BackgroundModuleSchema, sumiHost } from "../plugins/sumi-host/src/index.ts";
import { FakeStore } from "./host-tauri-fake-store.ts";
import { check, tally } from "./check-helpers.ts";

const probe = plugin("probe")
	.require(mcp)
	.fill(
		mcp.mcpModules.add({
			id: "questions",
			module: () => questionsModule,
			contract: questions,
		}),
	);
const started = pluginRuntime()
	.builtInPlugins(sumiHost, mcp, probe)
	.state(new MemoryPluginStateStore(["sumi-host", "mcp", "probe"]))
	.start();
const offers = {
	store: new StoreClient(new FakeStore().invoke),
	file: {
		read: () => Promise.resolve(null),
		write: () => Promise.resolve(),
	},
};
const background = started.fillsOf(sumiHost.backgroundModules).map((fill) => ({
	pluginId: fill.pluginId,
	item: BackgroundModuleSchema.parse(fill.item),
}));

check("the plugins start with no refusal", started.refusals, []);
check(
	"mcp.mcpModules.add puts the module in the background modules, filled by the mcp plugin",
	background.map(({ pluginId, item }) => [pluginId, item.contract.name, item.exposes.length]),
	[
		["mcp", "mcp", 0],
		["mcp", "questions", 1],
	],
);

const core = runtime()
	.modules(...background.map(({ pluginId, item }) => item.module({ ...offers, ...started.readerOf(pluginId) })))
	.start({
		platform: "server",
		env: {},
		scope: { workspaceId: "mcp-plugin-workspace" },
	});
const exposures = background.flatMap(({ item }) =>
	item.exposes.map((expose) => () =>
		expose({
			runtime: core,
			module: item.contract.name,
		}),
	),
);
exposures.forEach((expose) => expose());
check("serveMcp mounts the questions module over MCP, and only it", exposures.length, 1);

const listed = await core.send(mcpContract.servers.mcpServers);
check(
	"the mcp module lists every module of its slot as a server, with its tools",
	listed.ok ? listed.output.map(({ name, kind, tools }) => [name, kind, tools.length > 0]) : listed.reason,
	[["questions", "module", true]],
);
check(
	"a listed tool is named by its path in the module",
	listed.ok ? listed.output[0]?.tools.some(({ name }) => name === "dock_chat-questions") : listed.reason,
	true,
);

if (tally.failed > 0) {
	process.exitCode = 1;
}
