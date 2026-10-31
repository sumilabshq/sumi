import { AppTabsQuery, OpenLinkCommand } from "../packages/domain/app-host/generated/contract.ts";
import { linkOf, linkTargetOf } from "../packages/shared/core/src/engine/sumi-link.ts";
import type { LinkTarget } from "../packages/shared/core/src/engine/sumi-link.ts";
import { PaneTreeQuery } from "../packages/state/layout/generated/contract.ts";
import { HOST_CHAT, studioFakesOf } from "./app-host-fixture.ts";
import { check, tally } from "./check-helpers.ts";

console.info = () => undefined;
console.error = () => undefined;

const TARGETS: readonly LinkTarget[] = [
	{ kind: "chat", id: "chat-1" },
	{ kind: "task", id: "T-12" },
	{ kind: "tab", id: "a b/c?d#e%f" },
	{ kind: "app", id: "tasks" },
	{ kind: "chat", id: "café ü" },
];

for (const target of TARGETS) {
	check(`${target.kind} ${target.id} reads back from its link`, linkTargetOf(linkOf(target)), { ok: true, target });
}

check("an id is %-escaped in the link", linkOf({ kind: "tab", id: "a b/c" }), "sumi://tab/a%20b%2Fc");
check("a link reads back to its target", linkTargetOf("sumi://task/T-12"), {
	ok: true,
	target: { kind: "task", id: "T-12" },
});

const REFUSED: readonly [string, string][] = [
	["https://example.com", "https://example.com is not a Sumi link: one reads sumi://<chat|task|tab|app>/<id>"],
	["sumi://chat", "sumi://chat is not a Sumi link: one reads sumi://<chat|task|tab|app>/<id>"],
	["sumi://chat/a/b", "sumi://chat/a/b is not a Sumi link: one reads sumi://<chat|task|tab|app>/<id>"],
	["sumi://note/x", "sumi://note/x names no chat, task, tab or app, so there is nothing to open"],
	["sumi://task/", "sumi://task/ names no task to open"],
	["sumi://tab/%E0%A4%A", "sumi://tab/%E0%A4%A carries a broken %-escape in its id"],
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

await openLink(linkOf({ kind: "task", id: "T-1" }));
const firstTask = await shownTab();
check("a task link opens that task in a shown tasks tab", [firstTask?.app, firstTask?.address], ["tasks", "T-1"]);

await openLink(linkOf({ kind: "task", id: "T-1" }));
check(
	"a plain press on the same task link reuses the tab holding that task",
	(await tasksTabs()).map((tab) => [tab.id, tab.address]),
	[[firstTask?.id, "T-1"]],
);

await openLink(linkOf({ kind: "task", id: "T-1" }), true);
check(
	"a press that opens new puts the task in a tab of its own",
	(await tasksTabs()).map((tab) => tab.address),
	["T-1", "T-1"],
);

await openLink(linkOf({ kind: "app", id: "canvas" }));
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
	"an unreadable link is refused with what is wrong",
	notSumi.ok ? null : notSumi.reason,
	"sumi://note/x names no chat, task, tab or app, so there is nothing to open",
);

if (tally.failed > 0) {
	console.log(`${tally.failed} link check(s) failed`);
	process.exit(1);
}

console.log("all link checks hold");
