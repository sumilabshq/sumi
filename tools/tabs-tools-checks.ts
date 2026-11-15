import { z } from "zod";
import { localTransport, runtime } from "@widgetarium/data-framework";
import type { McpServer, Runtime } from "@widgetarium/data-framework";
import { MemoryPluginStateStore, plugin, runtime as pluginRuntime } from "@widgetarium/plugin-framework";
import { StoreClient } from "@widgetarium/behaviors/tauri-store";
import type { WindowOffers } from "@sumi/sumi-host-plugin";
import { apps } from "../plugins/apps/src/index.ts";
import { agent } from "../plugins/ai/agent/src/index.ts";
import { agents, backend, shell, windows } from "../plugins/sumi-host/src/index.ts";
import { chatTabs } from "../plugins/ai/chat/data/chat-tabs/generated/module.ts";
import { browser } from "../packages/domain/browser/generated/module.ts";
import { layout } from "../packages/state/layout/generated/module.ts";
import { workspaces } from "../packages/domain/workspaces/generated/module.ts";
import {
	agentsFor,
	backendFor,
	emptyHostRegistrations,
	shellFor,
	windowsFor,
} from "../apps/studio/src/plugins/host-services.ts";
import { AppCallerAuthenticate } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
import { FakeStore } from "./host-tauri-fake-store.ts";
import { check, tally } from "./check-helpers.ts";

const ToolReplySchema = z.object({
	result: z.object({
		content: z.array(z.object({ text: z.string() })),
	}),
});
const StateSectionsSchema = z.object({
	sections: z.array(
		z.object({
			list: z.string(),
			entries: z.array(z.object({ id: z.string(), app: z.string().optional() })),
		}),
	),
});
const WORKSPACE_ID = "tabs-tools-workspace";
const ASKING_CHAT = "chat-7";

const probeApps = plugin("probe-apps")
	.require(apps)
	.apply((app) => {
		app.use(apps).app({ id: "probe-notes", title: "Probe notes", art: "canvas" });
		app.use(apps).app({ id: "probe-maps", title: "Probe maps", art: "canvas" });
	});
const plugins = [agent, apps, probeApps];
const registered = emptyHostRegistrations();
const started = pluginRuntime()
	.builtInPlugins(...plugins)
	.state(new MemoryPluginStateStore(plugins.map(({ id }) => id)))
	.provide(backend, backendFor(registered))
	.provide(windows, windowsFor(registered))
	.provide(shell, shellFor(registered))
	.provide(agents, agentsFor(registered))
	.start();
const backendOffers = {
	store: new StoreClient(new FakeStore().invoke),
	file: {
		read: () => Promise.resolve(null),
		write: () => Promise.resolve(),
	},
};
const coreLink = localTransport();
coreLink.serve(
	runtime()
		.modules(...registered.backgroundModules.map(({ moduleOf }) => moduleOf(backendOffers)))
		.start({
			platform: "browser",
			scope: { workspaceId: WORKSPACE_ID },
		}),
	{ authenticate: new AppCallerAuthenticate() },
);
const windowApp = runtime()
	.modules(...registered.windowModules.map(({ moduleOf }) => moduleOf({})), browser, layout, workspaces, chatTabs)
	.imports(...registered.backgroundModules.map(({ contract }) => contract({ over: coreLink })))
	.start({
		platform: "browser",
		scope: { workspaceId: WORKSPACE_ID },
	});

function offersOf(app: Runtime): WindowOffers {
	return {
		workspaceId: WORKSPACE_ID,
		platform: "browser",
		windowApp: app,
		core: { call: () => Promise.reject(new Error("no core here")), changes: () => () => undefined },
		windowServer: { call: () => Promise.reject(new Error("no window server here")), changes: () => () => undefined },
		focusedChatId: () => null,
	};
}

let callId = 0;

async function called(
	server: McpServer | undefined,
	name: string,
	args: object,
	chat: string | null,
): Promise<unknown> {
	callId += 1;
	const headers = new Headers(chat === null ? {} : { "sumi-chat": chat });
	return server?.answer(
		{ jsonrpc: "2.0", id: callId, method: "tools/call", params: { name, arguments: args } },
		{ headers },
	);
}

function textOf(reply: unknown): string {
	return JSON.stringify(reply);
}

function recentsOf(answer: unknown): unknown {
	const recents = StateSectionsSchema.parse(answer).sections.find(({ list }) => list === "workspace");
	return recents?.entries.map(({ id, app }) => ({ id, app }));
}

function toolAnswerOf(reply: unknown): unknown {
	const [content] = ToolReplySchema.parse(reply).result.content;
	return JSON.parse(content?.text ?? "null");
}

check("the plugins start with no refusal", started.refusals, []);

const [served] = registered.agentMcpServers.map(({ serve }) => serve(offersOf(windowApp)));
check("the apps plugin registers one MCP server, named apps", served?.name, "apps");
check("the server lists the tab tools by their request names", served?.tools.map(({ name }) => name).sort(), [
	"tabs_apps_all",
	"tabs_group_create",
	"tabs_group_edit",
	"tabs_group_remove",
	"tabs_tab_close",
	"tabs_tab_duplicate",
	"tabs_tab_open",
	"tabs_tab_update",
	"tabs_workspace_state",
]);
check(
	"every tool is described for the agent",
	served?.tools.filter(({ description }) => (description ?? "").length < 20).map(({ name }) => name),
	[],
);
check(
	"the apps tool says what it lists",
	served?.tools.find(({ name }) => name === "tabs_apps_all")?.description,
	"List the apps a tab can open: each id is what tabs_tab_open takes as app.",
);

check(
	"the apps tool answers the apps the apps module holds, not a fixed list",
	toolAnswerOf(await called(served, "tabs_apps_all", {}, ASKING_CHAT)),
	{
		apps: [
			{ id: "probe-notes", title: "Probe notes" },
			{ id: "probe-maps", title: "Probe maps" },
		],
	},
);

const unasked = textOf(await called(served, "tabs_apps_all", {}, null));
check(
	"a call without the chat header is refused as unauthenticated",
	unasked.includes('"isError":true') && unasked.includes("tabs.apps.all needs a signed-in user"),
	true,
);

const unknownApp = textOf(await called(served, "tabs_tab_open", { app: "canvas" }, ASKING_CHAT));
check(
	"opening a tab in an app no plugin added is refused, naming the apps there are",
	unknownApp.includes('"isError":true') &&
		unknownApp.includes("No app canvas. A tab opens one of: probe-notes, probe-maps."),
	true,
);

check(
	"the state names the asking chat from the header",
	toolAnswerOf(await called(served, "tabs_workspace_state", {}, ASKING_CHAT)),
	{
		thisChat: ASKING_CHAT,
		chats: [],
		shownTab: null,
		sections: [],
	},
);

check(
	"a tab opens in an app the apps module holds, in Recents, hidden",
	toolAnswerOf(await called(served, "tabs_tab_open", { app: "probe-notes", place: "workspace" }, ASKING_CHAT)),
	{ id: "tab-1", place: "workspace", isShown: false },
);
check(
	"the state lists the opened tab under Recents",
	recentsOf(toolAnswerOf(await called(served, "tabs_workspace_state", {}, ASKING_CHAT))),
	[{ id: "tab-1", app: "probe-notes" }],
);
check("a Recents tab closes", toolAnswerOf(await called(served, "tabs_tab_close", { tabId: "tab-1" }, ASKING_CHAT)), {
	closed: "tab-1",
});
check(
	"the closed tab leaves Recents",
	recentsOf(toolAnswerOf(await called(served, "tabs_workspace_state", {}, ASKING_CHAT))),
	[],
);

const foreign = textOf(
	await called(served, "tabs_group_create", { name: "Elsewhere", place: "chat-other" }, ASKING_CHAT),
);
check(
	"a group names no place: a window has one list",
	foreign.includes('"isError":true') && foreign.includes("place"),
	true,
);

windowApp.stop();

if (tally.failed > 0) {
	process.exitCode = 1;
}
