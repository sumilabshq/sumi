import { z } from "zod";
import { JSDOM } from "jsdom";
import type { McpServer } from "../packages/shared/data-framework/src/index.ts";
import type { WindowOffers } from "../plugins/sumi-host/src/index.ts";
import { appHost } from "../plugins/apps/data/app-host/generated/contract.ts";
import { apps as appsContract } from "../plugins/apps/data/apps/generated/contract.ts";
import { layout } from "../packages/state/layout/generated/contract.ts";
import { refusePlace } from "../plugins/apps/data/tabs/shared/lib/tab-places.ts";
import type { WorkspaceState } from "../plugins/apps/data/tabs/shared/schema/workspace.schema.ts";
import { builtInPluginState, startSumiPlugins } from "../apps/studio/src/plugins/sumi-plugins.ts";
import { regionOnPage } from "../packages/domain/browser/shared/lib/region-within.ts";
import { READ_DOM } from "../packages/domain/browser/shared/lib/page-scripts.ts";
import { tabLinksRenderer } from "../apps/tauri/src/agent/tab-links.ts";
import { HOST_CHAT, studioFakesOf } from "./app-host-fixture.ts";
import { check, tally, thrownBy } from "./check-helpers.ts";

console.info = () => undefined;

type Section = WorkspaceState["sections"][number];

interface ToolAnswer {
	readonly isError: boolean;
	readonly text: string;
}

const ToolReplySchema = z.union([
	z.object({
		result: z.object({
			content: z.array(z.object({ text: z.string().optional() })),
			isError: z.boolean().optional(),
		}),
	}),
	z.object({ error: z.object({ message: z.string() }) }),
]);
const PlacedSchema = z.object({ id: z.string() });
const TabNowSchema = z.object({
	title: z.string(),
	place: z.string(),
});
const AppsSchema = z.object({ apps: z.array(z.object({ id: z.string() })) });
const ListedToolsSchema = z.object({
	result: z.object({
		tools: z.array(
			z.object({
				name: z.string(),
				inputSchema: z.object({
					properties: z.record(z.string(), z.object({ description: z.string().optional() }).loose()),
				}),
			}),
		),
	}),
});

const fakes = studioFakesOf({ isAppsInCore: true });

function offersOf(): WindowOffers {
	return {
		workspaceId: "workspace-1",
		platform: "browser",
		windowApp: fakes.studioApp,
		core: { call: () => Promise.reject(new Error("no core here")), changes: () => () => undefined },
		windowServer: { call: () => Promise.reject(new Error("no window server here")), changes: () => () => undefined },
		focusedChatId: () => null,
	};
}

function servedOrNull(serve: (offers: WindowOffers) => McpServer): McpServer | null {
	try {
		return serve(offersOf());
	} catch {
		return null;
	}
}

const served = startSumiPlugins(builtInPluginState()).agentMcpServers.map(({ serve }) => servedOrNull(serve));
const appsServer = served.find((server) => server?.name === "apps") ?? null;
const browserServer = served.find((server) => server?.name === "browser") ?? null;
let callId = 0;

async function replyOf(server: McpServer | null, method: string, params: unknown): Promise<unknown> {
	callId += 1;
	return server?.answer(
		{ jsonrpc: "2.0", id: callId, method, params },
		{ headers: new Headers({ "sumi-chat": HOST_CHAT }) },
	);
}

async function toolOf(server: McpServer | null, name: string, args: unknown): Promise<ToolAnswer> {
	const reply = ToolReplySchema.parse(await replyOf(server, "tools/call", { name, arguments: args }));

	if ("error" in reply) {
		return {
			isError: true,
			text: reply.error.message,
		};
	}

	return {
		isError: reply.result.isError === true,
		text: reply.result.content.map(({ text }) => text ?? "").join(""),
	};
}

async function tabTool(name: string, args: unknown): Promise<unknown> {
	const answer = await toolOf(appsServer, name, args);

	if (answer.isError) {
		throw new Error(`${name} refused: ${answer.text}`);
	}

	return JSON.parse(answer.text);
}

async function refusalOf(name: string, args: unknown): Promise<string> {
	const answer = await toolOf(name.startsWith("pages_") ? browserServer : appsServer, name, args);
	return answer.isError ? answer.text : "";
}

async function opened(args: unknown): Promise<string> {
	return PlacedSchema.parse(await tabTool("tabs_tab_open", args)).id;
}

async function sectionOf(place: string): Promise<Section | undefined> {
	const state = z.custom<WorkspaceState>().parse(await tabTool("tabs_workspace_state", {}));
	return state.sections.find((section) => section.place === place);
}

function tabsIn(section: Section | undefined) {
	return (section?.entries ?? []).flatMap((entry) => {
		if (entry.kind === "tab") {
			return [entry];
		}

		return entry.kind === "group" ? entry.tabs : [];
	});
}

function idsIn(section: Section | undefined): readonly string[] {
	return tabsIn(section).map((tab) => tab.id);
}

function firstGroupOf(section: Section | undefined) {
	return section?.entries.find((entry) => entry.kind === "group");
}

async function isShown(tabId: string): Promise<boolean> {
	return tabsIn(await sectionOf("this-chat")).some((tab) => tab.id === tabId && tab.isShown);
}

async function pageWasShown(tabId: string): Promise<boolean> {
	const held = await fakes.studioApp.send(appHost.tabs.heldTabs);
	const pageId = held.ok ? held.output.tabs.find((tab) => tab.id === tabId)?.pageId : undefined;
	return pageId === undefined || pageId === null || fakes.pages.calls.includes(`show ${pageId}`);
}

async function shownTabId(): Promise<string | null> {
	const held = await fakes.studioApp.send(appHost.tabs.heldTabs);
	return held.ok ? held.output.shownTabId : "unread";
}

await fakes.studioApp.send(appHost.tabActions.openTab, { app: "browser" });
const shownBefore = await shownTabId();

const hidden = await opened({ app: "browser", target: "https://jira.example.com" });
check("a tab opened without show leaves the person's tab on screen", await shownTabId(), shownBefore);
check("it opens in this chat by default", idsIn(await sectionOf("this-chat")).includes(hidden), true);
check("it is not shown", await isShown(hidden), false);
check("its page loads the address without ever being shown", await pageWasShown(hidden), false);

const workspaceShown = await opened({ app: "browser", place: "workspace", show: true });
check("a workspace tab opened with show is the one on screen", await shownTabId(), workspaceShown);
await opened({ app: "browser", target: "https://mail.example.com", place: "workspace" });
check("a workspace tab opened without show leaves it there", await shownTabId(), workspaceShown);

const offBoard = await opened({ app: "browser", show: true });
check("show: true leaves a tab of a chat off the board off screen", await isShown(offBoard), false);
await fakes.studioApp.send(layout.paneTabs.showChat, { chatId: HOST_CHAT, paneId: null });
const shown = await opened({ app: "browser", show: true });
check("show: true shows the new tab of a chat on the board", await isShown(shown), true);

const grouped = await opened({
	app: "browser",
	target: "https://slack.example.com",
	newGroup: { name: "Work", colour: "blue" },
});
const work = firstGroupOf(await sectionOf("this-chat"));
check(
	"newGroup creates the named, coloured group and opens the tab in it",
	work?.kind === "group" ? [work.name, work.colour, work.tabs.map((tab) => tab.id)] : null,
	["Work", "blue", [grouped]],
);

const copy = PlacedSchema.parse(await tabTool("tabs_tab_duplicate", { tabId: hidden, place: "workspace" })).id;
check("tabs_tab_duplicate copies into the place asked", idsIn(await sectionOf("workspace")).includes(copy), true);

const renamed = TabNowSchema.parse(await tabTool("tabs_tab_update", { tabId: hidden, title: "Board" }));
check(
	"tabs_tab_update renames and answers the tab as it is now",
	[renamed.title, renamed.place],
	["Board", "this-chat"],
);

const moved = TabNowSchema.parse(await tabTool("tabs_tab_update", { tabId: hidden, place: "workspace" }));
check("tabs_tab_update moves a tab to the workspace", moved.place, "workspace");

const groupId = work?.kind === "group" ? work.id : "";
await tabTool("tabs_group_edit", { groupId, name: "Client", colour: "green" });
const recoloured = firstGroupOf(await sectionOf("this-chat"));
check(
	"tabs_group_edit renames and recolours",
	recoloured?.kind === "group" ? [recoloured.name, recoloured.colour] : null,
	["Client", "green"],
);

await tabTool("tabs_group_remove", { groupId });
const afterUngroup = await sectionOf("this-chat");
check(
	"tabs_group_remove keeps the tabs by default",
	[firstGroupOf(afterUngroup) === undefined, idsIn(afterUngroup).includes(grouped)],
	[true, true],
);

const made = PlacedSchema.parse(
	await tabTool("tabs_group_create", { name: "Docs", place: "this-chat", tabIds: [grouped] }),
).id;
const docs = firstGroupOf(await sectionOf("this-chat"));
check(
	"tabs_group_create makes the group and moves the tabs asked into it",
	docs?.kind === "group" ? [docs.id, docs.name, docs.tabs.map((tab) => tab.id)] : null,
	[made, "Docs", [grouped]],
);

await tabTool("tabs_group_remove", { groupId: made, keepTabs: false });
check(
	"tabs_group_remove with keepTabs false closes its tabs",
	idsIn(await sectionOf("this-chat")).includes(grouped),
	false,
);

await tabTool("tabs_tab_close", { tabId: copy });
check("tabs_tab_close closes the tab", idsIn(await sectionOf("workspace")).includes(copy), false);

check(
	"a tab is never opened into another chat's list",
	(await refusalOf("tabs_tab_open", { app: "browser", place: "chat-other" })).includes("place"),
	true,
);
const before = tabsIn(await sectionOf("workspace")).find((tab) => tab.id === hidden);
check(
	"a move into a group that is not in the list is refused",
	(await refusalOf("tabs_tab_update", { tabId: hidden, group: "group-404" })).includes("no group"),
	true,
);
check(
	"and the tab stays where it was",
	tabsIn(await sectionOf("workspace")).some((tab) => tab.id === hidden),
	true,
);
check(
	"a refused move renames nothing",
	[
		(await refusalOf("tabs_tab_update", { tabId: hidden, title: "Should not land", place: "chat-other" })).includes(
			"place",
		),
		tabsIn(await sectionOf("workspace")).find((tab) => tab.id === hidden)?.title,
	],
	[true, before?.title],
);
check(
	"area on a text read is refused",
	await refusalOf("pages_tab_read", { tabId: hidden, area: "page" }),
	"area and region apply only to a screenshot.",
);

const listedApps = await fakes.studioApp.send(appsContract.apps.all);
const moduleAppIds = listedApps.ok ? listedApps.output.apps.map(({ id }) => id) : [];
const toolAppIds = AppsSchema.parse(await tabTool("tabs_apps_all", {})).apps.map(({ id }) => id);
check(
	"tabs_apps_all names every app the apps module holds but the chat, not a fixed list",
	[toolAppIds, moduleAppIds.includes("chat"), toolAppIds.length > 0],
	[moduleAppIds.filter((id) => id !== "chat"), true, true],
);

const openedTask = await opened({ app: "tasks", target: "T-12" });
const taskTab = tabsIn(await sectionOf("this-chat")).find((tab) => tab.id === openedTask);
check(
	"tabs_tab_open with app tasks opens that task, not a web address",
	[taskTab?.app, taskTab?.address],
	["tasks", "T-12"],
);
check(
	"tabs_tab_open without an app is refused, so a task id never turns into a web search",
	(await refusalOf("tabs_tab_open", { target: "T-12" })).includes("app"),
	true,
);
const openedBoard = await opened({ app: "tasks" });
const boardTab = tabsIn(await sectionOf("this-chat")).find((tab) => tab.id === openedBoard);
check(
	"tabs_tab_open with app tasks and no target opens the board",
	[boardTab?.app, boardTab?.address ?? null],
	["tasks", null],
);

check(
	"a wrong input is refused with the request's name",
	(await refusalOf("tabs_tab_open", { place: "workspace" })).includes("tabs.tab.open"),
	true,
);
check(
	"both group and newGroup are refused",
	(await refusalOf("tabs_tab_open", { app: "browser", group: "g", newGroup: { name: "n" } })).includes(
		"either group or newGroup",
	),
	true,
);
check("an unknown tool is refused", await refusalOf("tab_fly", {}), "The MCP server apps has no tool tab_fly.");
check(
	"a missing tab is refused",
	(await refusalOf("tabs_tab_close", { tabId: "tab-404" })).includes("No tab tab-404"),
	true,
);
check(
	"pages_tab_read of a tab with no such id is refused",
	(await refusalOf("pages_tab_read", { tabId: "tab-404" })).includes("No tab tab-404 is open"),
	true,
);
check(
	"another chat's list may not be changed",
	(refusePlace("chat-other", HOST_CHAT) ?? "").includes("another chat"),
	true,
);
check(
	"this chat's list may be changed",
	[refusePlace(HOST_CHAT, HOST_CHAT), refusePlace("this-chat", HOST_CHAT)],
	[null, null],
);
check("the workspace list may be changed", refusePlace("workspace", HOST_CHAT), null);

const page = {
	width: 1200,
	height: 5000,
};
check("a page shot with no region is the whole page", regionOnPage(null, page), {
	x: 0,
	y: 0,
	width: 1200,
	height: 5000,
});
check(
	"a region running past the page's end is cut at it",
	regionOnPage({ x: 0, y: 4800, width: 1200, height: 800 }, page),
	{ x: 0, y: 4800, width: 1200, height: 200 },
);
check(
	"a region below the page is refused",
	thrownBy(() => regionOnPage({ x: 0, y: 6000, width: 10, height: 10 }, page)).includes("outside the page"),
	true,
);
check(
	"a shot over 8000 px a side is refused, naming its size",
	thrownBy(() => regionOnPage(null, { width: 1200, height: 9000 })).includes("1200×9000"),
	true,
);

const pageWithFields = new JSDOM(
	'<html><head><style>p{}</style></head><body><p>Board</p><input id="q"><input id="pw" type="password"><input type="hidden" value="csrf-123"><textarea id="note"></textarea><input id="done" type="checkbox"><select id="pick"><option>a</option><option>b</option></select><script>1</script></body></html>',
	{ runScripts: "outside-only" },
);
const liveDocument = pageWithFields.window.document;
const query = liveDocument.getElementById("q");
const password = liveDocument.getElementById("pw");

if (
	query instanceof pageWithFields.window.HTMLInputElement &&
	password instanceof pageWithFields.window.HTMLInputElement
) {
	query.value = "typed by the person";
	password.value = "hunter2";
}

const note = liveDocument.getElementById("note");
const done = liveDocument.getElementById("done");
const pick = liveDocument.getElementById("pick");

if (note instanceof pageWithFields.window.HTMLTextAreaElement) {
	note.value = "a typed note";
}

if (done instanceof pageWithFields.window.HTMLInputElement) {
	done.checked = true;
}

if (pick instanceof pageWithFields.window.HTMLSelectElement) {
	pick.selectedIndex = 1;
}

const domRead: unknown = pageWithFields.window.eval(READ_DOM);
const markup = typeof domRead === "object" && domRead !== null && "text" in domRead ? String(domRead.text) : "";
check("the dom read carries what the person typed", markup.includes('value="typed by the person"'), true);
check("the dom read never carries a password", markup.includes("hunter2"), false);
check("the dom read never carries a hidden field's value", markup.includes("csrf-123"), false);
check(
	"it carries typed notes, ticks and picks",
	[
		markup.includes(">a typed note</textarea>"),
		/id="done"[^>]*checked/.test(markup),
		/<option selected[^>]*>b</.test(markup),
	],
	[true, true, true],
);
check(
	"the dom read leaves scripts and styles out",
	[markup.includes("<script"), markup.includes("<style")],
	[false, false],
);
check(
	"the live page is left as it was",
	[liveDocument.querySelectorAll("script").length, query?.getAttribute("value") ?? null],
	[1, null],
);

const chatPage = new JSDOM("<div></div>");
const said = chatPage.window.document.createElement("div");
const unrender = tabLinksRenderer()(
	said,
	'Opened [Jira board](tab:tab-2) for you.\nNext line <img src=x onerror="alert(1)">\n\nSecond paragraph',
);
const tabLink = said.querySelector("a[data-tab]");
check(
	"an old tab: link is read as a sumi tab link naming its tab",
	[tabLink?.textContent, tabLink?.getAttribute("href"), tabLink?.getAttribute("data-tab")],
	["Jira board", "sumi://tab/tab-2", "tab-2"],
);
const taskSaid = chatPage.window.document.createElement("div");
tabLinksRenderer()(taskSaid, "Made [the task](sumi://task/T-1) and [a chat](sumi://chat/chat%201)");
check(
	"a sumi link renders as a plain link carrying it",
	[...taskSaid.querySelectorAll("a")].map((link) => [link.textContent, link.getAttribute("href"), link.target]),
	[
		["the task", "sumi://task/T-1", ""],
		["a chat", "sumi://chat/chat%201", ""],
	],
);
check(
	"paragraphs and line breaks are kept",
	[said.querySelectorAll("p").length, said.querySelectorAll("br").length],
	[2, 1],
);
check(
	"markup in the text stays text",
	[said.querySelector("img:not(.wg-studio-ai-link-icon)"), said.textContent?.includes("<img src=x")],
	[null, true],
);
check(
	"a tab link starts with the link glyph",
	tabLink?.firstElementChild?.className,
	"wg-studio-ai-link-icon is-glyph",
);
const webSaid = chatPage.window.document.createElement("div");
tabLinksRenderer()(webSaid, "Read [the docs](https://example.com/guide) first");
check(
	"a web link starts with its site's favicon",
	webSaid.querySelector("a > img.wg-studio-ai-link-icon")?.getAttribute("src"),
	"https://example.com/favicon.ico",
);
const iconSaid = chatPage.window.document.createElement("div");
await new Promise<void>((shown) => {
	tabLinksRenderer(async () => {
		queueMicrotask(shown);
		return "https://example.com/tab.png";
	})(iconSaid, "Opened [Jira board](tab:tab-2)");
});
await Promise.resolve();
check(
	"a tab link takes that tab's favicon once it is known",
	iconSaid.querySelector("a > img.wg-studio-ai-link-icon")?.getAttribute("src"),
	"https://example.com/tab.png",
);
unrender();
check("unrendering empties the holder", said.childNodes.length, 0);

const appsTools = ListedToolsSchema.parse(await replyOf(appsServer, "tools/list", {})).result.tools;
const browserTools = ListedToolsSchema.parse(await replyOf(browserServer, "tools/list", {})).result.tools;
check(
	"the agent is told exactly the tab and page tools the servers answer",
	[appsTools.map(({ name }) => name).toSorted(), browserTools.map(({ name }) => name).toSorted()],
	[
		[
			"tabs_apps_all",
			"tabs_group_create",
			"tabs_group_edit",
			"tabs_group_remove",
			"tabs_tab_close",
			"tabs_tab_duplicate",
			"tabs_tab_open",
			"tabs_tab_update",
			"tabs_workspace_state",
		],
		["pages_tab_access", "pages_tab_read"],
	],
);
const appProperty = appsTools.find(({ name }) => name === "tabs_tab_open")?.inputSchema.properties["app"];
check(
	"tabs_tab_open names no fixed apps: it points the agent at tabs_apps_all",
	[appProperty !== undefined && "enum" in appProperty, appProperty?.description?.includes("tabs_apps_all")],
	[false, true],
);
const refusedApps: string[] = [];

for (const app of toolAppIds) {
	const answer = await toolOf(appsServer, "tabs_tab_open", { app });

	if (answer.isError) {
		refusedApps.push(`${app}: ${answer.text}`);
	}
}

check("tabs_tab_open opens a tab in every app tabs_apps_all lists", refusedApps, []);

fakes.studioApp.stop();

if (tally.failed > 0) {
	console.log(`${tally.failed} agent tab tool check(s) failed`);
	process.exit(1);
}

console.log("all agent tab tool checks hold");
