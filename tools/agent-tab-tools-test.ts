import { HeldTabsQuery, OpenTabCommand } from "../packages/domain/app-host/generated/contract.ts";
import { AGENT_TOOLS, runAgentTool } from "../apps/host-tauri/src/agent/run-agent-tool.ts";
import { readFileSync } from "node:fs";
import { appState, appsList } from "../apps/host-tauri/src/agent/state-tools.ts";
import {
	groupCreate,
	groupDelete,
	groupUpdate,
	tabClose,
	tabDuplicate,
	tabOpen,
	tabUpdate,
} from "../apps/host-tauri/src/agent/tab-tools.ts";
import { assertOwnList } from "../apps/host-tauri/src/agent/tool-places.ts";
import { regionOnPage } from "../packages/domain/browser/shared/lib/region-within.ts";
import { READ_DOM } from "../packages/domain/browser/shared/lib/page-scripts.ts";
import { JSDOM } from "jsdom";
import { tabLinksRenderer } from "../apps/host-tauri/src/agent/tab-links.ts";
import type { AppState } from "../apps/host-tauri/src/agent/app-state.ts";
import { HOST_CHAT, studioFakesOf } from "./app-host-fixture.ts";
import { check, tally, thrownBy } from "./check-helpers.ts";

console.info = () => undefined;

type Section = AppState["sections"][number];

const fakes = studioFakesOf();
const context = {
	app: fakes.studioApp,
	chatId: HOST_CHAT,
};

async function refusalOf(name: string, input: unknown): Promise<string> {
	try {
		await runAgentTool(context, name, input);
		return "";
	} catch (failure) {
		return failure instanceof Error ? failure.message : String(failure);
	}
}

async function sectionOf(place: string): Promise<Section | undefined> {
	return (await appState(context, {})).sections.find((section) => section.place === place);
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
	const held = await fakes.studioApp.send(HeldTabsQuery);
	const pageId = held.ok ? held.output.tabs.find((tab) => tab.id === tabId)?.pageId : undefined;
	return pageId === undefined || pageId === null || fakes.pages.calls.includes(`show ${pageId}`);
}

async function shownTabId(): Promise<string | null> {
	const held = await fakes.studioApp.send(HeldTabsQuery);
	return held.ok ? held.output.shownTabId : "unread";
}

await fakes.studioApp.send(OpenTabCommand, { app: "browser" });
const shownBefore = await shownTabId();

const hidden = await tabOpen(context, { target: "https://jira.example.com" });
check("a tab opened without show leaves the person's tab on screen", await shownTabId(), shownBefore);
check("it opens in this chat by default", idsIn(await sectionOf("this-chat")).includes(hidden.id), true);
check("it is not shown", await isShown(hidden.id), false);
check("its page loads the address without ever being shown", await pageWasShown(hidden.id), false);

const workspaceShown = await tabOpen(context, { target: "browser", place: "workspace", show: true });
check("a workspace tab opened with show is the one on screen", await shownTabId(), workspaceShown.id);
await tabOpen(context, { target: "https://mail.example.com", place: "workspace" });
check("a workspace tab opened without show leaves it there", await shownTabId(), workspaceShown.id);

const shown = await tabOpen(context, { target: "browser", show: true });
check("show: true shows the new tab", await isShown(shown.id), true);

const grouped = await tabOpen(context, {
	target: "https://slack.example.com",
	newGroup: { name: "Work", colour: "blue" },
});
const work = firstGroupOf(await sectionOf("this-chat"));
check(
	"newGroup creates the named, coloured group and opens the tab in it",
	work?.kind === "group" ? [work.name, work.colour, work.tabs.map((tab) => tab.id)] : null,
	["Work", "blue", [grouped.id]],
);

const copy = await tabDuplicate(context, { tabId: hidden.id, place: "workspace" });
check("tab_duplicate copies into the place asked", idsIn(await sectionOf("workspace")).includes(copy.id), true);

const renamed = await tabUpdate(context, { tabId: hidden.id, title: "Board" });
check("tab_update renames and answers the tab as it is now", [renamed.title, renamed.place], ["Board", "this-chat"]);

const moved = await tabUpdate(context, { tabId: hidden.id, place: "workspace" });
check("tab_update moves a tab to the workspace", moved.place, "workspace");

const groupId = work?.kind === "group" ? work.id : "";
await groupUpdate(context, { groupId, name: "Client", colour: "green" });
const recoloured = firstGroupOf(await sectionOf("this-chat"));
check(
	"group_update renames and recolours",
	recoloured?.kind === "group" ? [recoloured.name, recoloured.colour] : null,
	["Client", "green"],
);

await groupDelete(context, { groupId });
const afterUngroup = await sectionOf("this-chat");
check(
	"group_delete keeps the tabs by default",
	[firstGroupOf(afterUngroup) === undefined, idsIn(afterUngroup).includes(grouped.id)],
	[true, true],
);

const made = await groupCreate(context, { name: "Docs", tabIds: [grouped.id] });
const docs = firstGroupOf(await sectionOf("this-chat"));
check(
	"group_create makes the group and moves the tabs asked into it",
	docs?.kind === "group" ? [docs.id, docs.name, docs.tabs.map((tab) => tab.id)] : null,
	[made.id, "Docs", [grouped.id]],
);

await groupDelete(context, { groupId: made.id, keepTabs: false });
check(
	"group_delete with keepTabs false closes its tabs",
	idsIn(await sectionOf("this-chat")).includes(grouped.id),
	false,
);

await tabClose(context, { tabId: copy.id });
check("tab_close closes the tab", idsIn(await sectionOf("workspace")).includes(copy.id), false);

check(
	"a tab is never opened into another chat's list",
	(await refusalOf("tab_open", { target: "browser", place: "chat-other" })).includes("belongs to another chat"),
	true,
);
const before = tabsIn(await sectionOf("workspace")).find((tab) => tab.id === hidden.id);
check(
	"a move into a group that is not in the list is refused",
	(await refusalOf("tab_update", { tabId: hidden.id, group: "group-404" })).includes("no group"),
	true,
);
check(
	"and the tab stays where it was",
	tabsIn(await sectionOf("workspace")).some((tab) => tab.id === hidden.id),
	true,
);
check(
	"a refused move renames nothing",
	[
		(await refusalOf("tab_update", { tabId: hidden.id, title: "Should not land", place: "chat-other" })).includes(
			"another chat",
		),
		tabsIn(await sectionOf("workspace")).find((tab) => tab.id === hidden.id)?.title,
	],
	[true, before?.title],
);
check(
	"area on a text read is refused",
	await refusalOf("tab_read", { tabId: hidden.id, area: "page" }),
	"area and region apply only to a screenshot.",
);

check(
	"apps_list names the apps a tab can open",
	(await appsList()).apps.map((app) => app.id),
	["browser", "canvas"],
);

check(
	"a wrong input is refused with the tool's name",
	(await refusalOf("tab_open", { place: "workspace" })).includes("tab_open input"),
	true,
);
check(
	"both group and newGroup are refused",
	(await refusalOf("tab_open", { target: "browser", group: "g", newGroup: { name: "n" } })).includes(
		"either group or newGroup",
	),
	true,
);
check("an unknown tool is refused", await refusalOf("tab_fly", {}), "Sumi has no tool named tab_fly.");
check(
	"a missing tab is refused",
	(await refusalOf("tab_close", { tabId: "tab-404" })).includes("No tab tab-404"),
	true,
);
check(
	"tab_read of a tab with no such id is refused",
	(await refusalOf("tab_read", { tabId: "tab-404" })).includes("No tab tab-404 is open"),
	true,
);
check(
	"another chat's list may not be changed",
	thrownBy(() => assertOwnList("chat-other", HOST_CHAT, "The tab t")).includes("another chat"),
	true,
);
check(
	"this chat's list may be changed",
	thrownBy(() => assertOwnList(HOST_CHAT, HOST_CHAT, "The tab t")),
	"",
);
check(
	"the workspace list may be changed",
	thrownBy(() => assertOwnList("workspace", HOST_CHAT, "The tab t")),
	"",
);

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
const pressedTabs: string[] = [];
const unrender = tabLinksRenderer((tabId) => pressedTabs.push(tabId))(
	said,
	'Opened [Jira board](tab:tab-2) for you.\nNext line <img src=x onerror="alert(1)">\n\nSecond paragraph',
);
const tabLink = said.querySelector("a[data-tab]");
check(
	"a tab: link becomes a link naming its tab",
	[tabLink?.textContent, tabLink?.getAttribute("data-tab")],
	["Jira board", "tab-2"],
);
check(
	"paragraphs and line breaks are kept",
	[said.querySelectorAll("p").length, said.querySelectorAll("br").length],
	[2, 1],
);
check(
	"markup in the text stays text",
	[said.querySelector("img"), said.textContent?.includes("<img src=x")],
	[null, true],
);
tabLink?.dispatchEvent(new chatPage.window.MouseEvent("click", { bubbles: true, cancelable: true }));
check("pressing the link shows that tab", pressedTabs, ["tab-2"]);
unrender();
check("unrendering empties the holder", said.childNodes.length, 0);

const listedTools: unknown = JSON.parse(readFileSync("apps/host-tauri/src-tauri/src/agent/tools.json", "utf8"));
check(
	"the app answers exactly the tools Claude is told about",
	Array.isArray(listedTools) ? listedTools.map((tool: { name: string }) => tool.name).toSorted() : null,
	Object.keys(AGENT_TOOLS).toSorted(),
);

if (tally.failed > 0) {
	console.log(`${tally.failed} agent tab tool check(s) failed`);
	process.exit(1);
}

console.log("all agent tab tool checks hold");
