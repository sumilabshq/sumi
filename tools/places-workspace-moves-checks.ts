import { localTransport, runtime } from "../packages/shared/data-framework/src/index.ts";
import type { Runtime } from "../packages/shared/data-framework/src/index.ts";
import { StoreClient, workspaceRootOf } from "../packages/shared/behaviors/src/tauri-store/store-client.ts";
import { navigation } from "../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import type { TabsAsk } from "../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import { navigation as RunnableNavigation } from "../plugins/tabs/navigation/data/navigation/generated/module.ts";
import { MemoryTabsGateway } from "../plugins/tabs/navigation/data/navigation/gateways/tabs/memory.gateway.ts";
import type { TabsGateway } from "../plugins/tabs/navigation/data/navigation/gateways/tabs/tabs.gateway.ts";
import { keptPlacesParts } from "../plugins/tabs/navigation/data/navigation/gateways/places-parts/places-parts.gateway.ts";
import type { MovePlacedTabs } from "../plugins/tabs/navigation/data/navigation/shared/lib/settling/settling.ts";
import { tabBreaksOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/tab-invariants.ts";
import { momentOfWindow } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/kept-tabs.ts";
import { PlacedTabsSchema } from "../plugins/tabs/navigation/data/navigation/shared/schema/tabs.schema.ts";
import type { ListEntry, PlacedTabs } from "../plugins/tabs/navigation/data/navigation/shared/schema/tabs.schema.ts";
import { BARE_SCREEN, MAIN_WINDOW, placedTabsOf } from "./places-fixture.ts";
import { BUILT_IN_APPS, BUILT_IN_PLACED_APPS, builtInPlacedApps } from "./placed-apps-fixture.ts";
import { DEFAULT, FakeStore, RESEARCH } from "./host-tauri-fake-store.ts";
import { check, tally, waitFor } from "./check-helpers.ts";

const OTHER = "other-workspace";
const AT: TabsAsk = { window: MAIN_WINDOW, screen: BARE_SCREEN };

function sourceTabs(): PlacedTabs {
	return placedTabsOf(
		{
			tabs: [
				{ id: "tab-1", app: "tasks", pageId: null, label: null },
				{ id: "tab-2", app: "canvas", pageId: null, label: "Board" },
				{ id: "tab-3", app: "tasks", pageId: null, label: null },
				{ id: "tab-4", app: "canvas", pageId: null, label: null, lastAddress: "canvas://four" },
			],
			lists: {
				workspace: [
					{ kind: "tab", id: "tab-1" },
					{ kind: "group", id: "group-5" },
					{ kind: "tab", id: "tab-4" },
				],
			},
			groups: [
				{
					id: "group-5",
					name: "Work",
					hue: "blue",
					isOpen: true,
					entries: [
						{ kind: "tab", id: "tab-2" },
						{ kind: "group", id: "group-6" },
					],
				},
				{ id: "group-6", name: "Inner", hue: null, isOpen: false, entries: [{ kind: "tab", id: "tab-3" }] },
			],
			shownId: "tab-1",
			minted: 6,
			closed: [],
		},
		["chat-a"],
	);
}

function targetTabs(): PlacedTabs {
	return placedTabsOf({
		tabs: [{ id: "tab-1", app: "tasks", pageId: null, label: "Theirs" }],
		shownId: "tab-1",
		minted: 1,
		closed: [],
	});
}

function coreOver(tabs: TabsGateway): Runtime {
	const core = localTransport();
	core.serve(
		runtime()
			.modules(RunnableNavigation({ injects: { tabs, placedApps: builtInPlacedApps() } }))
			.start({ platform: "server", env: {} }),
	);
	return runtime()
		.imports(navigation({ over: core }))
		.start();
}

function idsOf(entries: readonly ListEntry[] | undefined): readonly string[] {
	return (entries ?? []).map(({ kind, id }) => `${kind}:${id}`);
}

function breaksIn(placed: PlacedTabs): readonly string[] {
	return tabBreaksOf(momentOfWindow(placed, null, BUILT_IN_APPS));
}

async function moveChecks(): Promise<void> {
	const target = new MemoryTabsGateway(targetTabs());
	const source = new MemoryTabsGateway(sourceTabs(), new Map([[OTHER, target]]));
	const window = coreOver(source);

	const tabMoved = await window.send(navigation.workspaceMoves.move, {
		at: AT,
		entry: { kind: "tab", id: "tab-4" },
		workspace: OTHER,
	});
	const afterTab = await source.placedTabs();
	const arrivedTab = await target.placedTabs();
	check("a tab moves to another workspace", tabMoved.ok, true);
	check(
		"the tab leaves this workspace and is not offered to reopen",
		[idsOf(afterTab.lists["workspace"]), afterTab.tabs.some(({ id }) => id === "tab-4"), afterTab.closed.length],
		[["tab:chat-a", "tab:tab-1", "group:group-5"], false, 0],
	);
	check(
		"it lands at the end of the other workspace under an id minted there, its address kept",
		[
			idsOf(arrivedTab.lists["workspace"]),
			arrivedTab.minted,
			arrivedTab.tabs.find(({ id }) => id === "tab-2")?.lastAddress,
			arrivedTab.tabs.find(({ id }) => id === "tab-1")?.label,
		],
		[["tab:tab-1", "tab:tab-2"], 2, "canvas://four", "Theirs"],
	);

	const groupMoved = await window.send(navigation.workspaceMoves.move, {
		at: AT,
		entry: { kind: "group", id: "group-5" },
		workspace: OTHER,
	});
	const afterGroup = await source.placedTabs();
	const arrivedGroup = await target.placedTabs();
	check("a group moves to another workspace", groupMoved.ok, true);
	check(
		"the group leaves with every tab and group inside it",
		[idsOf(afterGroup.lists["workspace"]), afterGroup.groups.length, afterGroup.tabs.map(({ id }) => id).sort()],
		[["tab:chat-a", "tab:tab-1"], 0, ["chat-a", "tab-1"]],
	);
	check(
		"it lands whole, every id minted anew in the other workspace",
		[
			idsOf(arrivedGroup.lists["workspace"]),
			arrivedGroup.groups.map(({ id, name, hue, entries }) => [id, name, hue, idsOf(entries)]),
			arrivedGroup.tabs.map(({ id, label }) => [id, label]),
			arrivedGroup.minted,
		],
		[
			["tab:tab-1", "tab:tab-2", "group:group-5"],
			[
				["group-5", "Work", "blue", ["tab:tab-3", "group:group-6"]],
				["group-6", "Inner", null, ["tab:tab-4"]],
			],
			[
				["tab-1", "Theirs"],
				["tab-2", null],
				["tab-3", "Board"],
				["tab-4", null],
			],
			6,
		],
	);
	check("both workspaces break no tab law", [breaksIn(afterGroup), breaksIn(arrivedGroup)], [[], []]);
}

async function refusalChecks(): Promise<void> {
	const target = new MemoryTabsGateway(targetTabs());
	const source = new MemoryTabsGateway(sourceTabs(), new Map([[OTHER, target]]));
	const window = coreOver(source);
	const sourceBefore = JSON.stringify(await source.placedTabs());
	const targetBefore = JSON.stringify(await target.placedTabs());

	const chat = await window.send(navigation.workspaceMoves.move, {
		at: AT,
		entry: { kind: "tab", id: "chat-a" },
		workspace: OTHER,
	});
	check(
		"a chat tab is refused: its conversation stays in this workspace",
		chat.ok ? "moved" : chat.reason,
		'the tab "chat-a" is a chat: a chat stays in the workspace that keeps its conversation',
	);

	const same = await window.send(navigation.workspaceMoves.move, {
		at: AT,
		entry: { kind: "group", id: "group-5" },
		workspace: source.workspaceId(),
	});
	check("a move into the same workspace is refused", same.ok ? "moved" : same.reason, "the group is in this workspace already");

	const missing = await window.send(navigation.workspaceMoves.move, {
		at: AT,
		entry: { kind: "group", id: "group-9" },
		workspace: OTHER,
	});
	check("a group that is not here is refused", missing.ok ? "moved" : missing.reason, 'no group "group-9"');
	check(
		"no refused move changes either workspace",
		[JSON.stringify(await source.placedTabs()) === sourceBefore, JSON.stringify(await target.placedTabs()) === targetBefore],
		[true, true],
	);
}

class RacingTabs extends MemoryTabsGateway {
	private hasRaced = false;

	override async movePlacedTabsIn<T>(workspaceId: string, move: MovePlacedTabs<T>): Promise<T> {
		const answer = await super.movePlacedTabsIn(workspaceId, move);

		if (!this.hasRaced) {
			this.hasRaced = true;
			await this.movePlacedTabs((now) => ({
				next: {
					...now,
					tabs: [...now.tabs, PlacedTabsSchema.shape.tabs.element.parse({ id: "tab-9", app: "tasks", pageId: null, label: null })],
					groups: now.groups.map((group) =>
						group.id === "group-6" ? { ...group, entries: [...group.entries, { kind: "tab" as const, id: "tab-9" }] } : group,
					),
					minted: 9,
				},
				reason: "another window adds tab-9 to group-6",
				answer: null,
			}));
		}

		return answer;
	}
}

async function raceChecks(): Promise<void> {
	const target = new MemoryTabsGateway(targetTabs());
	const source = new RacingTabs(sourceTabs(), new Map([[OTHER, target]]));
	const targetBefore = JSON.stringify(await target.placedTabs());
	const moved = await coreOver(source).send(navigation.workspaceMoves.move, {
		at: AT,
		entry: { kind: "group", id: "group-5" },
		workspace: OTHER,
	});
	const kept = await source.placedTabs();
	check(
		"a group that changes while it moves stays here, the change kept",
		[moved.ok ? "moved" : moved.reason, kept.groups.find(({ id }) => id === "group-6")?.entries.length],
		["the group changed while it moved, so it stays here", 2],
	);
	check(
		"and its copy is taken back out of the other workspace",
		[idsOf((await target.placedTabs()).lists["workspace"]), (await target.placedTabs()).tabs.length],
		[["tab:tab-1"], 1],
	);
	check(
		"the copy taken back leaves the other workspace as it was but for the minted count",
		JSON.stringify({ ...(await target.placedTabs()), minted: 1 }) === targetBefore,
		true,
	);
}

async function openTargetChecks(): Promise<void> {
	const fake = new FakeStore();
	const navigationOf = (workspaceId: string): string => `${workspaceRootOf(workspaceId)}:navigation.json`;
	fake.put(navigationOf(DEFAULT.id), { v: 1, rev: 1, panesCarried: true, tabs: sourceTabs() });
	fake.put(navigationOf(RESEARCH.id), { v: 1, rev: 1, panesCarried: true, tabs: targetTabs() });
	const store = new StoreClient(fake.invoke);
	const config = { store, apps: BUILT_IN_PLACED_APPS };
	const research = keptPlacesParts(config, RESEARCH.id);
	const heard = { changes: 0 };
	research.tabs.placedTabsChanged(() => {
		heard.changes += 1;
	});
	await research.tabs.placedTabs();

	const moved = await coreOver(keptPlacesParts(config, DEFAULT.id).tabs).send(navigation.workspaceMoves.move, {
		at: AT,
		entry: { kind: "tab", id: "tab-4" },
		workspace: RESEARCH.id,
	});
	check("a tab moves into a workspace whose navigation is open in the core", moved.ok, true);
	check(
		"the open workspace sees the tab at once and hears the change",
		[idsOf((await research.tabs.placedTabs()).lists["workspace"]), heard.changes > 0],
		[["tab:tab-1", "tab:tab-2"], true],
	);
	check(
		"both files are written: the tab is on disk in its new workspace and gone from the old",
		await waitFor(() => {
			const there = PlacedTabsSchema.safeParse(fake.files.get(navigationOf(RESEARCH.id))?.["tabs"]);
			const here = PlacedTabsSchema.safeParse(fake.files.get(navigationOf(DEFAULT.id))?.["tabs"]);
			return (
				there.success &&
				here.success &&
				there.data.tabs.some(({ id }) => id === "tab-2") &&
				!here.data.tabs.some(({ id }) => id === "tab-4")
			);
		}),
		true,
	);
}

const quiet = { info: console.info, warn: console.warn, error: console.error };
console.info = () => undefined;
console.warn = () => undefined;
console.error = () => undefined;
await moveChecks();
await refusalChecks();
await raceChecks();
await openTargetChecks();
console.info = quiet.info;
console.warn = quiet.warn;
console.error = quiet.error;
console.log(
	tally.failed ? `places workspace moves: ${tally.failed} check(s) failed` : "places workspace moves: all checks passed",
);
process.exit(tally.failed ? 1 : 0);
