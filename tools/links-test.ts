import { AppTabsQuery, OpenLinkCommand } from "../plugins/apps/data/app-host/generated/contract.ts";
import { linkOf, linkTargetOf } from "../packages/shared/core/src/engine/sumi-link.ts";
import type { LinkTarget } from "../packages/shared/core/src/engine/sumi-link.ts";
import { PaneTreeQuery } from "../packages/state/layout/generated/contract.ts";
import { HOST_CHAT, studioFakesOf } from "./app-host-fixture.ts";
import { check, tally } from "./check-helpers.ts";

console.info = () => undefined;
console.error = () => undefined;

const TARGETS: readonly LinkTarget[] = [
	{ kind: "chat", id: "chat-1" },
	{ kind: "page", app: "tasks", address: "T-12" },
	{ kind: "tab", id: "a b/c?d#e%f" },
	{ kind: "page", app: "tasks", address: "" },
	{ kind: "page", app: "notes", address: "a b/c" },
	{ kind: "chat", id: "café ü" },
];

for (const target of TARGETS) {
	check(`${JSON.stringify(target)} reads back from its link`, linkTargetOf(linkOf(target)), { ok: true, target });
}

check("an id is %-escaped in the link", linkOf({ kind: "tab", id: "a b/c" }), "sumi://tab/a%20b%2Fc");

const OLD_LINKS: readonly [string, LinkTarget][] = [
	["sumi://task/T-12", { kind: "page", app: "tasks", address: "T-12" }],
	["sumi://app/canvas", { kind: "page", app: "canvas", address: "" }],
	["sumi://chat/c-1", { kind: "chat", id: "c-1" }],
	["sumi://tab/tab-3", { kind: "tab", id: "tab-3" }],
	["sumi://tasks/T-1", { kind: "page", app: "tasks", address: "T-1" }],
	["sumi://notes", { kind: "page", app: "notes", address: "" }],
	["sumi://notes/a/b", { kind: "page", app: "notes", address: "a/b" }],
];

for (const [href, target] of OLD_LINKS) {
	check(`${href} reads to its target`, linkTargetOf(href), { ok: true, target });
}

const REFUSED: readonly [string, string][] = [
	["https://example.com", "https://example.com opens nowhere: Sumi opens sumi://<app>/<page> links and https:// pages"],
	["sumi://chat", "sumi://chat names no chat to open"],
	["sumi://chat/a/b", "sumi://chat/a/b names a chat inside another: a chat link holds one id"],
	["sumi://Note/x", "sumi://Note/x names no app, so there is nothing to open"],
	["sumi://task/", "sumi://task/ names no task to open"],
	["sumi://tab/%E0%A4%A", "sumi://tab/%E0%A4%A carries a broken %-escape in its page"],
];

for (const [href, reason] of REFUSED) {
	check(`${href} is refused with a reason`, linkTargetOf(href), { ok: false, reason });
}

const fakes = studioFakesOf();
const studio = fakes.studioApp;

async function openLink(href: string, opensNew = false) {
	return studio.send(OpenLinkCommand, { href, opensNew });
}

async function tabsNow() {
	const answer = await studio.send(AppTabsQuery);
	return answer.ok ? answer.output.tabs : [];
}

async function tasksTabs() {
	return (await tabsNow()).filter((tab) => tab.app === "tasks");
}

async function shownTab() {
	return (await tabsNow()).find((tab) => tab.isShown);
}

await openLink(linkOf({ kind: "page", app: "tasks", address: "T-1" }));
const firstTask = await shownTab();
check("a task link opens that task in a shown tasks tab", [firstTask?.app, firstTask?.address], ["tasks", "T-1"]);

await openLink(linkOf({ kind: "page", app: "tasks", address: "T-1" }));
check(
	"a plain press on the same task link reuses the tab holding that task",
	(await tasksTabs()).map((tab) => [tab.id, tab.address]),
	[[firstTask?.id, "T-1"]],
);

await openLink(linkOf({ kind: "page", app: "tasks", address: "T-1" }), true);
check(
	"a press that opens new puts the task in a tab of its own",
	(await tasksTabs()).map((tab) => tab.address),
	["T-1", "T-1"],
);

await openLink(linkOf({ kind: "page", app: "canvas", address: "" }));
check("an app link opens that app shown", (await shownTab())?.app, "canvas");

await openLink(linkOf({ kind: "tab", id: firstTask?.id ?? "" }));
check("a tab link shows that tab", (await shownTab())?.id, firstTask?.id);

async function paneViews() {
	const tree = await studio.send(PaneTreeQuery);
	return tree.ok ? tree.output.leaves.map((leaf) => leaf.view) : [];
}

check("before the chat link the pane shows an app", await paneViews(), [{ kind: "app", tabId: null }]);
await openLink(linkOf({ kind: "chat", id: HOST_CHAT }));
check("a chat link shows that chat in the pane", await paneViews(), [{ kind: "chat", chatId: HOST_CHAT }]);

const unknownApp = await openLink("sumi://app/rocket");
check(
	"a link to an app Sumi lacks is refused by name",
	unknownApp.ok ? null : unknownApp.reason,
	"Sumi has no app named rocket",
);

const missingTab = await openLink(linkOf({ kind: "tab", id: "tab-gone" }));
check("a link to a tab that is gone is refused", missingTab.ok, false);

const notSumi = await openLink("sumi://note/x");
check(
	"a link to an app no registry knows is refused by name",
	notSumi.ok ? null : notSumi.reason,
	"Sumi has no app named note",
);

await openLink("sumi://tasks/T-5");
const byRegistry = await shownTab();
check("sumi://<app id>/<page> opens that app at that page", [byRegistry?.app, byRegistry?.address], ["tasks", "T-5"]);

if (tally.failed > 0) {
	console.log(`${tally.failed} link check(s) failed`);
	process.exit(1);
}

console.log("all link checks hold");
