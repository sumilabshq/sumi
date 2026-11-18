import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { FakeStore } from "../host-tauri-fake-store.ts";
import { check, tally } from "../check-helpers.ts";
import { workspaceTabsOf } from "../../plugins/tabs/navigation/data/navigation/gateways/tabs/tauri/legacy-tabs.ts";
import { PlacedTabsSchema } from "../../plugins/tabs/navigation/data/navigation/shared/schema/tabs.schema.ts";
import type { PlacedTabs } from "../../plugins/tabs/navigation/data/navigation/shared/schema/tabs.schema.ts";
import { askAt, breaksOf, chatFacts, coreOn, diskTabs, navigation, silent } from "./fable-kit.ts";

const HOME = join(homedir(), ".sumi");
const rawGlobal: unknown = JSON.parse(readFileSync(join(HOME, "places.json"), "utf8"));
const rawWorkspaces: unknown = JSON.parse(readFileSync(join(HOME, "workspaces.json"), "utf8"));
const globalDoc = typeof rawGlobal === "object" && rawGlobal !== null ? (rawGlobal as Record<string, unknown>) : {};
const global = PlacedTabsSchema.parse(globalDoc["tabs"]);
const listed =
	typeof rawWorkspaces === "object" &&
	rawWorkspaces !== null &&
	"workspaces" in rawWorkspaces &&
	Array.isArray(rawWorkspaces.workspaces)
		? rawWorkspaces.workspaces.map((one: { id: string }) => one.id)
		: [];
const suffixOf = (window: string): string => window.split("@")[1] ?? "";
const inFile = [
	...Object.keys(global.lists).map((list) => suffixOf(list)),
	...Object.keys(global.views).map(suffixOf),
	...global.sessions.map(({ window }) => suffixOf(window)),
].filter((id) => id !== "");
const workspaces = [...new Set([...inFile, ...listed])];
const numberOf = (id: string): number => (id.startsWith("tab-") ? Number(id.slice(4)) : 0);

console.log(
	`global: ${global.tabs.length} live tabs, ${global.sessions.length} sessions, ${global.closed.length} closed, minted ${global.minted}`,
);
console.log(`workspaces: ${workspaces.join(", ")}`);

const carried = new Map<string, PlacedTabs>(workspaces.map((id) => [id, workspaceTabsOf(global, id).placed]));
const everyOldTab = new Map<string, string>();

for (const tab of global.tabs) {
	everyOldTab.set(tab.id, "live");
}

for (const session of global.sessions) {
	for (const tab of session.tabs) {
		if (!everyOldTab.has(tab.id)) {
			everyOldTab.set(tab.id, `session ${session.id.slice(0, 8)} of ${suffixOf(session.window).slice(0, 8)}`);
		}
	}
}

for (const [id, placed] of carried) {
	const short = id.slice(0, 8);
	check(`${short}: no law broken after the carry`, breaksOf(placed), []);
	check(
		`${short}: minted never goes back`,
		[placed.minted >= global.minted, placed.mintedSplits >= global.mintedSplits],
		[true, true],
	);
	const highest = Math.max(
		0,
		...placed.tabs.map((tab) => numberOf(tab.id)),
		...placed.closed.map(({ tab }) => numberOf(tab.id)),
		...placed.sessions.flatMap((s) => s.tabs.map((tab) => numberOf(tab.id))),
	);
	check(`${short}: the next minted tab id is above every kept one`, placed.minted >= highest, true);
	check(`${short}: joined windows start empty`, placed.windows, []);
	console.log(
		`   ${short}: ${placed.tabs.length} tabs (${placed.tabs.filter((tab) => tab.app === "chat").length} chats), ${placed.sessions.length} sessions kept read-only holding ${placed.sessions.reduce((sum, s) => sum + s.tabs.length, 0)} tabs, ${placed.closed.length} closed, ${placed.splits.length} splits`,
	);
}

const shownSomewhere = new Set([...carried.values()].flatMap((placed) => placed.tabs.map(({ id }) => id)));
const onlyInSessions = [...everyOldTab].filter(([id]) => !shownSomewhere.has(id));
const stillInSessions = new Set(
	[...carried.values()].flatMap((placed) => placed.sessions.flatMap((s) => s.tabs.map(({ id }) => id))),
);
const nowhere = onlyInSessions.filter(([id]) => !stillInSessions.has(id));
check("no old tab vanished from both the tabs and the read-only sessions", nowhere, []);
console.log(
	`   ${onlyInSessions.length} of ${everyOldTab.size} old tabs are now only inside read-only sessions (not in any sidebar)`,
);

const twice = [...shownSomewhere].filter(
	(id) => [...carried.values()].filter((placed) => placed.tabs.some((tab) => tab.id === id)).length > 1,
);
check("no tab was carried into two workspaces", twice, []);

const closedIn = [...carried].map(([id, placed]) => [id.slice(0, 8), placed.closed.length]);
check(
	"FINDING closed tabs: each closed tab of the global file goes to one workspace, not to every one",
	closedIn,
	closedIn.map(([id], at) => [id, at === 0 ? global.closed.length : 0]),
);
const closedChats = global.closed.filter(({ tab }) => tab.app === "chat").length;
console.log(
	`   ${global.closed.length} closed tabs (${closedChats} chats) were copied into each of ${carried.size} workspaces`,
);

async function chatsOfSessionsChecks(workspace: string): Promise<void> {
	const fake = new FakeStore();
	fake.put("global:places.json", globalDoc);
	const core = coreOn(fake.invoke, workspace);
	const main = core.window();
	await main.send(navigation.windows.openWindow, { window: "main" });
	const placed = diskTabs(fake, workspace);
	const hidden = (placed?.sessions ?? []).flatMap((session) =>
		session.tabs.filter((tab) => tab.app === "chat").map(({ id }) => id),
	);
	const unique = [...new Set(hidden)].filter((id) => !(placed?.tabs ?? []).some((tab) => tab.id === id));
	const kept = await main.send(chatFacts.turns.keepChatTabs, { chats: unique.map((id) => ({ id, title: null })) });
	const sidebar = await main.send(navigation.tabs.sidebar, { at: askAt("main", workspace) });
	const inSidebar = sidebar.ok
		? sidebar.output.sections.flatMap((section) =>
				section.entries.flatMap((entry) => (entry.kind === "tab" ? [entry.tab.id] : [])),
			)
		: [];
	check(
		`FINDING ${workspace.slice(0, 8)}: the ${unique.length} chats whose tab sits in a read-only session get a tab when the chat list asks for them`,
		[kept.ok, unique.filter((id) => inSidebar.includes(id)).length],
		[true, unique.length],
	);
	const once =
		unique[0] === undefined
			? null
			: await main.send(navigation.tabOpening.openOnce, { at: askAt("main", workspace), id: unique[0], app: "chat" });
	const after = diskTabs(fake, workspace);
	console.log(
		`   openOnce of such a chat: ${once === null ? "none" : once.ok ? "ok" : once.reason}; in tabs now: ${unique[0] !== undefined && (after?.tabs ?? []).some((tab) => tab.id === unique[0])}`,
	);
	check(
		`${workspace.slice(0, 8)}: the global file was not written`,
		fake.commandsCalled().filter((c) => c === "replace").length > 0 &&
			JSON.stringify(fake.files.get("global:places.json")) === JSON.stringify(globalDoc),
		true,
	);
}

async function alreadyThereChecks(): Promise<void> {
	const workspace = workspaces[0] ?? "";
	const fake = new FakeStore();
	fake.put("global:places.json", globalDoc);
	fake.put(`workspace:${workspace}:navigation.json`, {
		v: 1,
		rev: 3,
		tabs: {
			tabs: [{ id: "tab-900", app: "canvas", pageId: null, label: null }],
			lists: { workspace: [{ kind: "tab", id: "tab-900" }] },
			minted: 900,
			closed: [],
		},
	});
	const main = coreOn(fake.invoke, workspace).window();
	const placed = await main.send(navigation.tabs.placedTabs, { window: "main" });
	check(
		"a workspace doc that already holds tabs is not carried over again",
		placed.ok ? [placed.output.tabs.map(({ id }) => id), placed.output.minted] : placed.reason,
		[["tab-900"], 900],
	);
}

async function unreadableGlobalChecks(): Promise<void> {
	const workspace = workspaces[0] ?? "";
	const fake = new FakeStore();
	fake.put("global:places.json", { v: 1, rev: 1, tabs: { broken: true } });
	const main = coreOn(fake.invoke, workspace).window();
	const placed = await main.send(navigation.tabs.placedTabs, { window: "main" });
	check(
		"an unreadable global file gives an empty workspace, not a failure",
		placed.ok ? placed.output.tabs : placed.reason,
		[],
	);

	const refusing = new FakeStore();
	const invoke: typeof refusing.invoke = async (command, args) => {
		if (command.endsWith("|read") && args["root"] === "global") {
			throw { code: "io", detail: "disk gone" };
		}

		return refusing.invoke(command, args);
	};
	const other = coreOn(invoke, workspace).window();
	const read = await other.send(navigation.tabs.placedTabs, { window: "main" });
	check("a global file that cannot be read gives an empty workspace too", read.ok ? read.output.tabs : read.reason, []);
	const after = diskTabs(refusing, workspace);
	console.log(
		`   OBSERVED after that one failed global read the workspace doc holds ${after?.tabs.length ?? "no"} tabs on disk: the carry-over is never tried again`,
	);
}

async function recarriedChecks(): Promise<void> {
	const workspace = workspaces.find((id) => (carried.get(id)?.tabs.length ?? 0) > 1) ?? workspaces[0] ?? "";
	const fake = new FakeStore();
	fake.put("global:places.json", globalDoc);
	const first = coreOn(fake.invoke, workspace).window();
	await first.send(navigation.windows.openWindow, { window: "main" });
	const before = diskTabs(fake, workspace);
	const ids = before?.tabs.map(({ id }) => id) ?? [];

	for (const id of ids) {
		await first.send(navigation.tabClosing.closeTab, { at: askAt("main", workspace), id });
	}

	const emptied = diskTabs(fake, workspace);
	fake.quarantinedOnce.set(`workspace:${workspace}:navigation.json`, "navigation.json.unreadable-1");
	const second = coreOn(fake.invoke, workspace).window();
	const placed = await second.send(navigation.tabs.placedTabs, { window: "main" });
	check(
		`FINDING ${workspace.slice(0, 8)}: after the user closed all ${ids.length} carried tabs (${emptied?.tabs.length} left) and navigation.json was quarantined, the old global tabs do not come back`,
		placed.ok ? placed.output.tabs.length : placed.reason,
		0,
	);
}

const { logs } = await silent(async () => {
	for (const id of workspaces) {
		await chatsOfSessionsChecks(id);
	}

	await alreadyThereChecks();
	await unreadableGlobalChecks();
	await recarriedChecks();
});
const errors = logs.filter((line) => line.startsWith("error"));
console.log(`   errors logged: ${errors.length}${errors.length > 0 ? ` first: ${errors[0]?.slice(0, 200)}` : ""}`);
console.log(
	tally.failed ? `fable-migration-real: ${tally.failed} check(s) differ` : "fable-migration-real: all as expected",
);
process.exit(0);
