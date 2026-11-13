import { appHost } from "../plugins/apps/data/app-host/generated/contract.ts";
import { linkOf, linkTargetOf } from "../packages/shared/core/src/engine/sumi-link.ts";
import type { LinkTarget } from "../packages/shared/core/src/engine/sumi-link.ts";
import { layout } from "../packages/state/layout/generated/contract.ts";
import { HOST_CHAT, studioFakesOf } from "./app-host-fixture.ts";
import { check, tally } from "./check-helpers.ts";
import { GIT_LINK_GUIDE, gitAddressOf } from "../plugins/git/src/features/git-page/lib/git-address.ts";
import { appLinkGuidesOf } from "../plugins/apps/src/features/app-tab/lib/app-link-guides.ts";
import { withPromptParts } from "../plugins/ai/agent/data/assistant/shared/lib/turn-launcher.ts";
import { appsFilledBy } from "./apps-filled-fixture.ts";
import { files } from "../plugins/files/src/index.ts";
import { git } from "../plugins/git/src/index.ts";
import type { TurnFacts } from "../packages/shared/core/src/engine/assistant-port.ts";

const appLinkGuides = appLinkGuidesOf(appsFilledBy([files, git]));
check(
	"the apps prompt part lists the git and file link forms from their own apps",
	["- Git: sumi://git/", "- File: sumi://file/"].map((guide) => appLinkGuides.includes(guide)),
	[true, true],
);
check("no app with a link guide adds no prompt part", appLinkGuidesOf([]), "");

const LINKED_TURN: TurnFacts = {
	runner: "claude-code",
	prompt: "commit it",
	resume: null,
	model: null,
	options: {},
	project: "/work",
	attachments: "/tmp/attach",
	folders: [],
	link: {
		exe: "sumi",
		socket: "/tmp/sumi.sock",
		token: "t",
		chat: "c",
		servers: [],
		systemPrompt: "Sumi's prompt",
		mcpFlag: "--mcp",
		hookFlag: "--hook",
	},
};
check(
	"prompt parts follow Sumi's prompt in the turn's system prompt, empty parts left out",
	withPromptParts(LINKED_TURN, [() => "Git links", () => ""]).link?.systemPrompt,
	"Sumi's prompt\n\nGit links",
);
check(
	"a turn with no Sumi link takes no prompt parts",
	withPromptParts({ ...LINKED_TURN, link: null }, [() => "Git links"]).link,
	null,
);

console.info = () => undefined;
console.error = () => undefined;

const TARGETS: readonly LinkTarget[] = [
	{ kind: "chat", id: "chat-1" },
	{ kind: "page", app: "tasks", address: "T-12" },
	{ kind: "tab", id: "a b/c?d#e%f" },
	{ kind: "page", app: "tasks", address: "" },
	{ kind: "page", app: "notes", address: "a b/c" },
	{ kind: "chat", id: "café ü" },
	{ kind: "page", app: "git", address: "/r/my repo?head=a%26b&only=c1" },
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
	[
		"sumi://git//r/my%20repo?head=a%26b&only=c1",
		{ kind: "page", app: "git", address: "/r/my repo?head=a%26b&only=c1" },
	],
	["sumi://file//r/docs/plan.md", { kind: "page", app: "file", address: "/r/docs/plan.md" }],
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

const gitGuideExample = linkTargetOf(/\((sumi:\/\/git[^)]+)\)/.exec(GIT_LINK_GUIDE)?.[1] ?? "");
check(
	"the git link guide's example opens the git app at that repo, branch, base and commit",
	gitGuideExample.ok && gitGuideExample.target.kind === "page"
		? [gitGuideExample.target.app, gitAddressOf(gitGuideExample.target.address)]
		: gitGuideExample,
	["git", { folder: "/Users/me/repo", head: "feat/login", base: "main", only: "a1b2c3d" }],
);

const fakes = studioFakesOf();
const studio = fakes.studioApp;

async function openLink(href: string, opensNew = false) {
	return studio.send(appHost.links.openLink, { href, opensNew });
}

async function tabsNow() {
	const answer = await studio.send(appHost.tabs.appTabs);
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
	const tree = await studio.send(layout.panes.paneTree);
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
