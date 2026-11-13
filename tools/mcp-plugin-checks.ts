import { z } from "zod";
import { Anywhere, AuthenticatedGuard, module, named, query, runtime } from "@widgetarium/data-framework";
import type { Runtime } from "@widgetarium/data-framework";
import { MemoryPluginStateStore, plugin, runtime as pluginRuntime } from "@widgetarium/plugin-framework";
import type { Plugin } from "@widgetarium/plugin-framework";
import { mcp as mcpContract } from "@sumi/mcp/contract";
import type { WindowOffers } from "@sumi/sumi-host-plugin";
import { agent } from "../plugins/ai/agent/src/index.ts";
import { agents, windows } from "../plugins/sumi-host/src/index.ts";
import { agentsFor, emptyHostRegistrations, windowsFor } from "../apps/studio/src/plugins/host-services.ts";
import type { HostRegistrations } from "../apps/studio/src/plugins/host-services.ts";
import { check, tally } from "./check-helpers.ts";

interface StartedWindow {
	readonly registered: HostRegistrations;
	readonly refusals: readonly string[];
	readonly windowApp: Runtime;
}

const whoAsks = named("asking.who", query())
	.public()
	.metadata({ description: "The chat that asks." })
	.output(z.string())
	.handle((_input, { user }) => user?.id ?? "nobody");
const probeTools = module("probe-tools")
	.on(Anywhere)
	.guard(AuthenticatedGuard)
	.provide(() => ({}))
	.handles([whoAsks]);

function startedWindow(plugins: readonly Plugin[]): StartedWindow {
	const registered = emptyHostRegistrations();
	const started = pluginRuntime()
		.builtInPlugins(...plugins)
		.state(new MemoryPluginStateStore(plugins.map(({ id }) => id)))
		.provide(windows, windowsFor(registered))
		.provide(agents, agentsFor(registered))
		.start();
	const windowApp = runtime()
		.modules(...registered.windowModules.map(({ moduleOf }) => moduleOf({})))
		.start({
			platform: "browser",
			scope: { workspaceId: "mcp-plugin-workspace" },
		});
	return {
		registered,
		refusals: started.refusals,
		windowApp,
	};
}

function offersOf(windowApp: Runtime): WindowOffers {
	return {
		workspaceId: "mcp-plugin-workspace",
		platform: "browser",
		windowApp,
		core: { call: () => Promise.reject(new Error("no core here")), changes: () => () => undefined },
		windowServer: { call: () => Promise.reject(new Error("no window server here")), changes: () => () => undefined },
		focusedChatId: () => null,
	};
}

const probe = plugin("probe")
	.require(agent)
	.apply((app) => {
		app.use(agent).mcp.addServer({ name: "probe", modules: [probeTools] });
	});
const host = startedWindow([agent, probe]);
check("the plugins start with no refusal", host.refusals, []);
check(
	"a plugin's server is one more MCP server for agents, beside the agent's own agent-tools",
	host.registered.agentMcpServers.length,
	2,
);

const served = host.registered.agentMcpServers
	.map(({ serve }) => serve(offersOf(host.windowApp)))
	.find(({ name }) => name === "probe");
check(
	"the server serves only its own modules' requests",
	served?.tools.map(({ name }) => name),
	["probe-tools_asking_who"],
);

const listed = await host.windowApp.send(mcpContract.servers.all);
check(
	"the mcp module lists the served server with its tools",
	listed.ok
		? listed.output
				.filter(({ name }) => name === "probe")
				.map(({ name, tools }) => [name, tools.map((tool) => tool.name)])
		: listed.reason,
	[["probe", ["probe-tools_asking_who"]]],
);
check(
	"a tool call reads the chat from the header the relay stamps",
	await served?.answer(
		{ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "probe-tools_asking_who" } },
		{ headers: new Headers({ "sumi-chat": "chat-7" }) },
	),
	{ jsonrpc: "2.0", id: 1, result: { content: [{ type: "text", text: '"chat-7"' }] } },
);

const badName = plugin("bad-name")
	.require(agent)
	.apply((app) => {
		app.use(agent).mcp.addServer({ name: "Has Spaces", modules: [] });
	});
const refused = startedWindow([agent, badName]);
check(
	"a server name agents cannot allow refuses its plugin",
	refused.refusals.some((refusal) => refusal.includes("Has Spaces")),
	true,
);

if (tally.failed > 0) {
	process.exitCode = 1;
}
