import { z } from "zod";
import { Anywhere, PerCall, PublicGuard, command, module, named, query, runtime } from "@widgetarium/data-framework";
import type { Runtime } from "@widgetarium/data-framework";
import { MemoryPluginStateStore, runtime as pluginRuntime } from "@widgetarium/plugin-framework";
import type { Plugin } from "@widgetarium/plugin-framework";
import type { WindowOffers } from "@sumi/sumi-host-plugin";
import { pages } from "@sumi/pages/implementation";
import { apps } from "../plugins/apps/src/index.ts";
import { navigation } from "../plugins/tabs/navigation/src/index.ts";
import { tabGroups } from "../plugins/tabs/tab-groups/src/index.ts";
import { browserPage } from "../plugins/browser-page/src/index.ts";
import { agent } from "../plugins/ai/agent/src/index.ts";
import { agents, backend, shell, windows } from "../plugins/sumi-host/src/index.ts";
import {
	agentsFor,
	backendFor,
	emptyHostRegistrations,
	shellFor,
	windowsFor,
} from "../apps/studio/src/plugins/host-services.ts";
import { check, tally } from "./check-helpers.ts";

const PLUGINS: readonly Plugin[] = [navigation, tabGroups, apps, agent, browserPage];
const HELD_TABS = [
	{
		id: "tab-page",
		app: "browser",
		label: null,
		pageId: "page-1",
		address: "https://bank.test",
	},
	{
		id: "tab-blank",
		app: "browser",
		label: null,
		pageId: null,
		address: null,
	},
];
const asked: unknown[] = [];

const heldTabs = named("tabs.held-tabs", query())
	.public()
	.output(z.unknown())
	.handle(() => ({
		tabs: HELD_TABS,
		shownTabId: null,
	}));
const level = named("sites.level", query())
	.public()
	.input(z.object({ heldTabId: z.string().nullable() }))
	.output(z.unknown())
	.handle(({ heldTabId }) => ({
		shown: { decision: "deny", reason: "a bank", siteKey: "bank.test", level: "blocked", source: "list" },
		isKeptOut: heldTabId !== "page-1",
		rows: [],
	}));
const readPageContent = named("ink.read-page-content", command())
	.public()
	.input(z.unknown())
	.output(z.unknown())
	.idempotencyKey(PerCall)
	.handle((input) => {
		asked.push(input);
		return { url: "https://bank.test", title: "Bank", text: "Balance" };
	});
const capturePage = named("ink.capture-page", command())
	.public()
	.input(z.unknown())
	.output(z.unknown())
	.idempotencyKey(PerCall)
	.handle((input) => {
		asked.push(input);
		return { url: "https://bank.test", png: "iVBOR", width: 2, height: 2, layout: null };
	});
const fakeAppHost = module("app-host")
	.on(Anywhere)
	.guard(PublicGuard)
	.provide(() => ({}))
	.handles([heldTabs]);
const fakeBrowser = module("browser")
	.on(Anywhere)
	.guard(PublicGuard)
	.provide(() => ({}))
	.handles([level, readPageContent, capturePage]);

const registered = emptyHostRegistrations();
const started = pluginRuntime()
	.builtInPlugins(...PLUGINS)
	.state(new MemoryPluginStateStore(PLUGINS.map(({ id }) => id)))
	.provide(backend, backendFor(registered))
	.provide(windows, windowsFor(registered))
	.provide(shell, shellFor(registered))
	.provide(agents, agentsFor(registered))
	.start();
check("the plugins start with no refusal", started.refusals, []);

const windowApp = runtime()
	.modules(pages, fakeAppHost, fakeBrowser)
	.start({ platform: "browser", scope: { workspaceId: "pages-workspace" } });

function offersOf(app: Runtime): WindowOffers {
	return {
		workspaceId: "pages-workspace",
		platform: "browser",
		windowApp: app,
		core: { call: () => Promise.reject(new Error("no core here")), changes: () => () => undefined },
		windowServer: { call: () => Promise.reject(new Error("no window server here")), changes: () => () => undefined },
		focusedChatId: () => null,
	};
}

const served = registered.agentMcpServers.map(({ serve }) => serve(offersOf(windowApp)));
const browserServer = served.find(({ name }) => name === "browser");
check("browser-page registers the MCP server browser", served.map(({ name }) => name).includes("browser"), true);
check(
	"the server offers the page tools by their new names, with the old descriptions",
	browserServer?.tools.map(({ name, description }) => [name, description?.slice(0, 40)]),
	[
		["pages_tab_access", "Say whether Sumi may read a tab's site n"],
		["pages_tab_read", "Read a tab the person can see now: its t"],
	],
);

let nextId = 0;

function called(name: string, input: unknown, chat: string | null): Promise<unknown> {
	nextId += 1;
	return (
		browserServer?.answer(
			{ jsonrpc: "2.0", id: nextId, method: "tools/call", params: { name, arguments: input } },
			{ headers: new Headers(chat === null ? {} : { "sumi-chat": chat }) },
		) ?? Promise.resolve(null)
	);
}

function resultOf(answer: unknown): unknown {
	return z.object({ result: z.unknown() }).parse(answer).result;
}

check(
	"a call without the chat header is refused",
	z
		.object({ result: z.object({ isError: z.boolean() }) })
		.safeParse(await called("pages_tab_access", { tabId: "tab-page" }, null)).data?.result.isError,
	true,
);
check(
	"tab_access answers the site's read word and why",
	resultOf(await called("pages_tab_access", { tabId: "tab-page" }, "chat-1")),
	{
		content: [
			{
				type: "text",
				text: JSON.stringify(
					{
						tabId: "tab-page",
						site: "bank.test",
						accesses: { read: "denied" },
						decision: "deny",
						why: "a bank",
					},
					null,
					"\t",
				),
			},
		],
	},
);
check(
	"a tab no list holds is refused by name",
	resultOf(await called("pages_tab_access", { tabId: "tab-gone" }, "chat-1")),
	{ content: [{ type: "text", text: "No tab tab-gone is open." }], isError: true },
);
check("a tab with no page is refused", resultOf(await called("pages_tab_read", { tabId: "tab-blank" }, "chat-1")), {
	content: [{ type: "text", text: "The tab tab-blank has no page loaded." }],
	isError: true,
});
check(
	"area with text is refused",
	resultOf(await called("pages_tab_read", { tabId: "tab-page", area: "page" }, "chat-1")),
	{ content: [{ type: "text", text: "area and region apply only to a screenshot." }], isError: true },
);
await called("pages_tab_read", { tabId: "tab-page", as: "dom" }, "chat-1");
check("tab_read reads the tab's page in the asked form", asked.at(-1), { tabId: "page-1", form: "dom" });
const shot = resultOf(await called("pages_tab_read", { tabId: "tab-page", as: "screenshot" }, "chat-1"));
check("a screenshot shoots the viewport of the tab's page", asked.at(-1), {
	tabId: "page-1",
	region: null,
	area: "viewport",
});
check(
	"a screenshot answers an image",
	z
		.object({ content: z.array(z.object({ type: z.string() })) })
		.safeParse(shot)
		.data?.content.map(({ type }) => type),
	["image", "text"],
);

if (tally.failed > 0) {
	process.exitCode = 1;
}
