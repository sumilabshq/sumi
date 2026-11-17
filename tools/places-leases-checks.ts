import { AsyncLocalStorage } from "node:async_hooks";
import { labelOfPlacesWindow } from "@widgetarium/behaviors";
import { localTransport, runtime } from "../packages/shared/data-framework/src/index.ts";
import type { RemoteTransport, Runtime } from "../packages/shared/data-framework/src/index.ts";
import { StoreClient, workspaceRootOf } from "../packages/shared/behaviors/src/tauri-store/store-client.ts";
import { navigation } from "../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import type { TabsAsk } from "../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import { navigation as RunnableNavigation } from "../plugins/tabs/navigation/data/navigation/generated/module.ts";
import { tabGroups as RunnableTabGroups } from "../plugins/tabs/tab-groups/data/tab-groups/generated/module.ts";
import { chatFacts as RunnableChatFacts } from "../plugins/ai/chat/data/chat-facts/generated/module.ts";
import { MemoryTabsGateway } from "../plugins/tabs/navigation/data/navigation/gateways/tabs/memory.gateway.ts";
import { keptPlacesParts } from "../plugins/tabs/navigation/data/navigation/gateways/places-parts/places-parts.gateway.ts";
import type { PlacesParts } from "../plugins/tabs/navigation/data/navigation/gateways/places-parts/places-parts.gateway.ts";
import type { MovePlacedTabs } from "../plugins/tabs/navigation/data/navigation/shared/lib/settling/settling.ts";
import { displayedIdsOf, holdersOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/tab-leases.ts";
import { tabBreaksOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/tab-invariants.ts";
import { momentOfWindow } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/kept-tabs.ts";
import type { PlacedTabs } from "../plugins/tabs/navigation/data/navigation/shared/schema/tabs.schema.ts";
import { windowsLeftBehind } from "../apps/tauri/src/core-link/joined-windows.ts";
import { BARE_SCREEN } from "./places-fixture.ts";
import { BUILT_IN_APPS, BUILT_IN_PLACED_APPS, builtInPlacedApps } from "./placed-apps-fixture.ts";
import { DEFAULT, FakeStore } from "./host-tauri-fake-store.ts";
import { check, tally, waitFor } from "./check-helpers.ts";

interface Write {
	readonly actor: string | null;
	readonly before: PlacedTabs;
	readonly after: PlacedTabs;
}

const actors = new AsyncLocalStorage<string>();

class RecordingTabs extends MemoryTabsGateway {
	readonly writes: Write[] = [];

	override movePlacedTabs<T>(move: MovePlacedTabs<T>): Promise<T> {
		return super.movePlacedTabs((before) => {
			const moved = move(before);

			if (moved.next !== null) {
				this.writes.push({ actor: actors.getStore() ?? null, before, after: moved.next });
			}

			return moved;
		});
	}
}

interface Stand {
	readonly core: RemoteTransport;
	windowOf(): Runtime;
}

function standOver(tabs: MemoryTabsGateway | PlacesParts["tabs"]): Stand {
	const core = localTransport();
	const parts = { tabs, placedApps: builtInPlacedApps() };
	core.serve(
		runtime()
			.modules(
				RunnableNavigation({ injects: parts }),
				RunnableTabGroups({ injects: parts }),
				RunnableChatFacts({ injects: parts }),
			)
			.start({ platform: "server", env: {} }),
	);
	return {
		core,
		windowOf: () =>
			runtime()
				.imports(navigation({ over: core }))
				.start(),
	};
}

function askAt(window: string): TabsAsk {
	return { window, screen: BARE_SCREEN };
}

function randomOf(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
		mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
		return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
	};
}

function pickOf<T>(random: () => number, items: readonly T[]): T {
	const picked = items[Math.floor(random() * items.length)];

	if (picked === undefined) {
		throw new Error("picked from nothing");
	}

	return picked;
}

function doubleShownOf(placed: PlacedTabs): readonly string[] {
	const joined = new Set(placed.windows.map(({ label }) => label));
	const claims = new Map<string, string[]>();

	for (const [window, view] of Object.entries(placed.views)) {
		if (!joined.has(labelOfPlacesWindow(window))) {
			continue;
		}

		for (const id of new Set(displayedIdsOf(placed, view))) {
			claims.set(id, [...(claims.get(id) ?? []), window]);
		}
	}

	return [...claims]
		.filter(([, windows]) => windows.length > 1)
		.map(([id, windows]) => `${id} shown in ${windows.join(" + ")}`);
}

function danglingOf(placed: PlacedTabs): readonly string[] {
	const tabIds = new Set(placed.tabs.map(({ id }) => id));
	const splitIds = new Set(placed.splits.map(({ id }) => id));
	return Object.entries(placed.views).flatMap(([window, view]) => [
		...(view.shownId !== null && !tabIds.has(view.shownId) ? [`${window} shows gone ${view.shownId}`] : []),
		...(view.shownSplitId !== null && !splitIds.has(view.shownSplitId)
			? [`${window} shows gone ${view.shownSplitId}`]
			: []),
	]);
}

function closedWhileHeldOf(writes: readonly Write[]): readonly string[] {
	return writes.flatMap(({ actor, before, after }) => {
		const kept = new Set(after.tabs.map(({ id }) => id));
		const holders = holdersOf(before);
		return before.tabs
			.filter(({ id }) => !kept.has(id))
			.flatMap(({ id }) => {
				const holder = holders.get(id);
				return holder === undefined || labelOfPlacesWindow(holder) === actor
					? []
					: [`${id} held by ${holder} closed by ${actor ?? "the core"}`];
			});
	});
}

function takenWhileHeldOf(writes: readonly Write[]): readonly string[] {
	return writes.flatMap(({ actor, before, after }) => {
		const view = actor === null ? undefined : after.views[actor];

		if (actor === null || view === undefined) {
			return [];
		}

		const holders = holdersOf(before);
		const wasShown = new Set(before.views[actor] === undefined ? [] : displayedIdsOf(before, before.views[actor]));
		return displayedIdsOf(after, view)
			.filter((id) => !wasShown.has(id))
			.flatMap((id) => {
				const holder = holders.get(id);
				return holder === undefined || labelOfPlacesWindow(holder) === actor
					? []
					: [`${actor} took ${id} from ${holder}`];
			});
	});
}

function percentileOf(sorted: readonly number[], share: number): number {
	return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * share))] ?? 0;
}

async function timed<T>(run: () => Promise<T>, took: number[]): Promise<T> {
	const started = performance.now();
	const answer = await run();
	took.push(performance.now() - started);
	return answer;
}

async function sameTabRaceChecks(): Promise<void> {
	const tabs = new RecordingTabs();
	const stand = standOver(tabs);
	const windows = Array.from({ length: 20 }, (_none, at) => ({ label: `w${at}`, app: stand.windowOf() }));
	await Promise.all(windows.map(({ label, app }) => app.send(navigation.windows.openWindow, { window: label })));
	const opener = windows[0];

	if (opener === undefined) {
		return;
	}

	for (let at = 0; at < 100; at += 1) {
		await opener.app.send(navigation.tabOpening.openTab, { at: askAt(opener.label), app: "canvas", show: false });
	}

	const rounds = { winners: [] as number[], redirectsRight: 0, redirectsWrong: 0, refusals: 0 };

	for (let round = 1; round <= 100; round += 1) {
		const id = `tab-${round}`;
		const answers = await Promise.all(
			windows.map(({ label, app }) =>
				actors.run(label, () => app.send(navigation.tabShowing.show, { at: askAt(label), id })),
			),
		);
		const placed = await tabs.placedTabs();
		const shownBy = windows.filter(({ label }) => placed.views[label]?.shownId === id).map(({ label }) => label);
		const winner = shownBy[0] ?? "";
		rounds.winners.push(shownBy.length);
		answers.forEach((answer, at) => {
			const label = windows[at]?.label;

			if (!answer.ok) {
				rounds.refusals += 1;
				return;
			}

			const focus = answer.output.effects.find((effect) => effect.kind === "focus-window");

			if (label === winner) {
				return;
			}

			if (focus !== undefined && "window" in focus && focus.window === winner) {
				rounds.redirectsRight += 1;
			} else {
				rounds.redirectsWrong += 1;
			}
		});
	}

	check(
		"20 windows click the same free tab at once, 100 rounds: exactly one shows it each round",
		rounds.winners.every((count) => count === 1),
		true,
	);
	check(
		"and the 19 others are each sent to that window (1900 redirects, none wrong, none refused)",
		[rounds.redirectsRight, rounds.redirectsWrong, rounds.refusals],
		[1900, 0, 0],
	);
	check(
		"no write in the race ever showed one tab in two windows, or took a tab another window held",
		[tabs.writes.flatMap(({ after }) => doubleShownOf(after)), takenWhileHeldOf(tabs.writes)],
		[[], []],
	);
}

async function closeRaceChecks(): Promise<void> {
	const tabs = new RecordingTabs();
	const stand = standOver(tabs);
	const [one, other] = [stand.windowOf(), stand.windowOf()];
	await one.send(navigation.windows.openWindow, { window: "one" });
	await other.send(navigation.windows.openWindow, { window: "other" });
	const outcomes = { ownerClosed: 0, otherRefused: 0, otherClosed: 0, shownAfterClose: 0 };

	for (let round = 0; round < 200; round += 1) {
		const opened = await one.send(navigation.tabOpening.openTab, { at: askAt("one"), app: "canvas" });
		const id = opened.ok ? opened.output.id : "";
		const [own, foreign, show] = await Promise.all([
			one.send(navigation.tabClosing.closeTab, { at: askAt("one"), id }),
			other.send(navigation.tabClosing.closeTab, { at: askAt("other"), id }),
			other.send(navigation.tabShowing.show, { at: askAt("other"), id }),
		]);
		outcomes.ownerClosed += own.ok ? 1 : 0;
		outcomes.otherClosed += foreign.ok ? 1 : 0;
		outcomes.otherRefused += foreign.ok ? 0 : 1;
		const placed = await tabs.placedTabs();
		outcomes.shownAfterClose += show.ok && placed.views["other"]?.shownId === id ? 1 : 0;
	}

	check(
		"200 rounds of owner close + foreign close + foreign show of one tab at once: only the owner closes it",
		outcomes,
		{ ownerClosed: 200, otherRefused: 200, otherClosed: 0, shownAfterClose: 0 },
	);
}

async function navigateOverHeldChecks(): Promise<void> {
	const tabs = new RecordingTabs();
	const stand = standOver(tabs);
	const [one, other] = [stand.windowOf(), stand.windowOf()];
	await one.send(navigation.windows.openWindow, { window: "one" });
	await other.send(navigation.windows.openWindow, { window: "other" });
	const idOpenedBy = async (app: Runtime, window: string): Promise<string> => {
		const opened = await app.send(navigation.tabOpening.openTab, { at: askAt(window), app: "canvas" });
		return opened.ok ? opened.output.id : "";
	};
	const held = await idOpenedBy(other, "other");
	const left = await idOpenedBy(one, "one");
	const right = await idOpenedBy(one, "one");
	await one.send(navigation.splits.placeInView, { at: askAt("one"), tabId: left, targetTabId: right, side: "left" });
	const shown = await idOpenedBy(one, "one");
	const before = await tabs.placedTabs();
	const replaced = await one.send(navigation.tabOpening.navigate, {
		at: askAt("one"),
		target: { kind: "app", app: "browser" },
		where: "this-tab",
		from: held,
	});
	const movedIn = await one.send(navigation.tabOpening.navigate, {
		at: askAt("one"),
		target: { kind: "tab", id: held, isMoved: true },
		where: "this-tab",
		from: left,
	});
	const after = await tabs.placedTabs();
	check(
		"the stand: another window holds one tab, this one keeps a split it does not show",
		[
			holdersOf(before).get(held),
			before.splits.map(({ memberIds }) => [...memberIds].sort()),
			before.views["one"]?.shownId,
		],
		["other", [[left, right].sort()], shown],
	);
	check("navigate cannot turn a tab another window holds into another app", replaced.ok, false);
	check("navigate cannot move a tab another window holds into a split", movedIn.ok, false);
	check(
		"and the held tab, its holder and the split stay as they were",
		[after.tabs.find(({ id }) => id === held)?.app, holdersOf(after).get(held), after.splits],
		["canvas", "other", before.splits],
	);
}

async function fuzzChecks(): Promise<void> {
	const random = randomOf(20261117);
	const tabs = new RecordingTabs();
	const stand = standOver(tabs);
	const labels = Array.from({ length: 20 }, (_none, at) => `w${at}`);
	const apps = new Map(labels.map((label) => [label, stand.windowOf()]));
	const appOf = (label: string): Runtime => apps.get(label) ?? stand.windowOf();
	const opening: number[] = [];

	for (const label of labels) {
		await appOf(label).send(navigation.windows.openWindow, { window: label });
	}

	for (let at = 0; at < 1000; at += 1) {
		const label = pickOf(random, labels);
		await timed(
			() => appOf(label).send(navigation.tabOpening.openTab, { at: askAt(label), app: "canvas", show: false }),
			opening,
		);
	}

	const took: number[] = [];
	const answered = { ok: 0, refused: 0, redirected: 0 };
	const kinds = new Map<string, number>();
	const started = performance.now();

	const sizes: number[] = [];

	for (let batch = 0; batch < 100; batch += 1) {
		const placed = await tabs.placedTabs();
		sizes.push(placed.tabs.length);
		const ids = placed.tabs.map(({ id }) => id);
		const joined = placed.windows.map(({ label }) => label);
		const sends = Array.from({ length: 50 }, () => {
			const label = pickOf(random, labels);
			const id = ids.length === 0 ? "tab-1" : pickOf(random, ids);
			const roll = random();
			const app = appOf(label);
			const kind =
				roll < 0.35
					? "show"
					: roll < 0.5
						? "close"
						: roll < 0.58
							? "open"
							: roll < 0.66
								? "split"
								: roll < 0.72
									? "closeOthers"
									: roll < 0.78
										? "view"
										: roll < 0.84
											? "reopen"
											: roll < 0.9
												? "rename"
												: roll < 0.95
													? "leave"
													: "join";
			kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
			const sent = async (): Promise<{ readonly ok: boolean; readonly output?: unknown }> => {
				switch (kind) {
					case "show":
						return app.send(navigation.tabShowing.show, { at: askAt(label), id });
					case "close":
						return app.send(navigation.tabClosing.closeTab, { at: askAt(label), id });
					case "open":
						return app.send(navigation.tabOpening.openTab, { at: askAt(label), app: "canvas" });
					case "split":
						return app.send(navigation.splits.placeInView, {
							at: askAt(label),
							tabId: id,
							targetTabId: null,
							side: "right",
						});
					case "closeOthers":
						return batch >= 90 && random() < 0.05
							? app.send(navigation.tabClosing.closeOthers, { at: askAt(label), id })
							: app.send(navigation.tabShowing.show, { at: askAt(label), id });
					case "view":
						return app.send(navigation.tabShowing.showView, { window: label, view: random() < 0.5 ? "app" : "canvas" });
					case "reopen":
						return app.send(navigation.tabOpening.reopenClosed, { at: askAt(label), tabId: null });
					case "rename":
						return app.send(navigation.tabPlacing.rename, { window: label, id, label: `r${batch}` });
					case "leave":
						return joined.length < 3 ? { ok: true } : app.send(navigation.windows.closeWindow, { window: label });
					default:
						return app.send(navigation.windows.openWindow, { window: label });
				}
			};
			return timed(() => actors.run(label, sent), took).then((answer) => {
				answered.ok += answer.ok ? 1 : 0;
				answered.refused += answer.ok ? 0 : 1;
				const output = answer.output;
				const isRedirected =
					typeof output === "object" &&
					output !== null &&
					"effects" in output &&
					Array.isArray(output.effects) &&
					output.effects.some(
						(effect: unknown) =>
							typeof effect === "object" && effect !== null && "kind" in effect && effect.kind === "focus-window",
					);
				answered.redirected += isRedirected ? 1 : 0;
			});
		});
		await Promise.all(sends);
	}

	const elapsed = performance.now() - started;
	const sorted = [...took].sort((one, other) => one - other);
	const final = await tabs.placedTabs();
	console.log(
		`[load] 20 windows, tabs per batch min ${Math.min(...sizes)} avg ${(sizes.reduce((sum, size) => sum + size, 0) / sizes.length).toFixed(0)} max ${Math.max(...sizes)}, ${final.tabs.length} at the end, 5000 concurrent ops in batches of 50: ${(5000 / (elapsed / 1000)).toFixed(0)} ops/s, ` +
			`p50 ${percentileOf(sorted, 0.5).toFixed(1)} ms, p99 ${percentileOf(sorted, 0.99).toFixed(1)} ms, ` +
			`max ${percentileOf(sorted, 1).toFixed(1)} ms; opening 1000 tabs p50 ${percentileOf(
				[...opening].sort((one, other) => one - other),
				0.5,
			).toFixed(1)} ms; ` +
			`writes ${tabs.writes.length}; answers ${JSON.stringify(answered)}; ops ${JSON.stringify(Object.fromEntries(kinds))}`,
	);
	check(
		`fuzz: in ${tabs.writes.length} writes no tab ever showed in two joined windows`,
		tabs.writes.flatMap(({ after }) => doubleShownOf(after)).slice(0, 5),
		[],
	);
	check("fuzz: no window ever closed a tab another window held", closedWhileHeldOf(tabs.writes).slice(0, 5), []);
	check(
		"fuzz: no window ever started showing a tab another window held",
		takenWhileHeldOf(tabs.writes).slice(0, 5),
		[],
	);
	check(
		"fuzz: no view ever pointed at a gone tab or split",
		tabs.writes.flatMap(({ after }) => danglingOf(after)).slice(0, 5),
		[],
	);
	check(
		"fuzz: every 50th write keeps the list laws (one place per tab, no unknown entry)",
		tabs.writes
			.filter((_write, at) => at % 50 === 0 || at === tabs.writes.length - 1)
			.flatMap(({ after }) => tabBreaksOf(momentOfWindow(after, null, BUILT_IN_APPS)))
			.slice(0, 5),
		[],
	);

	await appOf("w0").send(navigation.windows.keepLiveWindows, { windows: [] });
	const empty = await tabs.placedTabs();
	check(
		"fuzz: when every window is gone nothing is held and no view is left",
		[holdersOf(empty).size, empty.windows.length, Object.keys(empty.views).length],
		[0, 0, 0],
	);
	const fresh = stand.windowOf();
	await fresh.send(navigation.windows.openWindow, { window: "fresh" });
	const stuck = { show: 0, close: 0 };

	for (const { id } of empty.tabs) {
		const shown = await fresh.send(navigation.tabShowing.show, { at: askAt("fresh"), id });
		const isFocused = shown.ok && shown.output.effects.some((effect) => effect.kind === "focus-window");
		stuck.show += !shown.ok || isFocused ? 1 : 0;
		const closed = await fresh.send(navigation.tabClosing.closeTab, { at: askAt("fresh"), id });
		stuck.close += closed.ok ? 0 : 1;
	}

	check(
		`fuzz: a new window then shows and closes every one of the ${empty.tabs.length} tabs left, none stuck`,
		[stuck, (await tabs.placedTabs()).tabs.length],
		[{ show: 0, close: 0 }, 0],
	);
}

async function restartChecks(): Promise<void> {
	const fake = new FakeStore();
	const config = (): { readonly store: StoreClient; readonly apps: typeof BUILT_IN_PLACED_APPS } => ({
		store: new StoreClient(fake.invoke),
		apps: BUILT_IN_PLACED_APPS,
	});
	const first = keptPlacesParts(config(), DEFAULT.id);
	const before = standOver(first.tabs);
	const [main, side] = [before.windowOf(), before.windowOf()];
	await main.send(navigation.windows.openWindow, { window: "main" });
	await side.send(navigation.windows.openWindow, { window: "studio-2" });

	for (let at = 0; at < 6; at += 1) {
		await (at % 2 === 0 ? main : side).send(navigation.tabOpening.openTab, {
			at: askAt(at % 2 === 0 ? "main" : "studio-2"),
			app: "canvas",
		});
	}

	const kept = await first.tabs.placedTabs();
	check("before the crash both windows hold the tab each shows", [...holdersOf(kept)].sort(), [
		["tab-5", "main"],
		["tab-6", "studio-2"],
	]);

	const second = keptPlacesParts(config(), DEFAULT.id);
	const after = await second.tabs.placedTabs();
	check(
		"after a crash and a cold start every tab is still in the workspace, in order",
		after.lists["workspace"]?.map((entry) => entry.id),
		["tab-1", "tab-2", "tab-3", "tab-4", "tab-5", "tab-6"],
	);
	check(
		"and no tab is held: the windows of the last run are gone",
		[after.windows.length, holdersOf(after).size],
		[0, 0],
	);
	const stand = standOver(second.tabs);
	const newcomer = stand.windowOf();
	await newcomer.send(navigation.windows.openWindow, { window: "studio-9" });
	const shown = await newcomer.send(navigation.tabShowing.show, { at: askAt("studio-9"), id: "tab-6" });
	const closed = await newcomer.send(navigation.tabClosing.closeTab, { at: askAt("studio-9"), id: "tab-5" });
	check(
		"a new window shows and closes the tabs the crashed windows held",
		[shown.ok && !shown.output.effects.some((effect) => effect.kind === "focus-window"), closed.ok],
		[true, true],
	);

	const rejoined = stand.windowOf();
	await rejoined.send(navigation.windows.openWindow, { window: "main" });
	const reshow = await rejoined.send(navigation.tabShowing.show, { at: askAt("main"), id: "tab-6" });
	check(
		"main joins again after the restart and asks for the tab studio-9 now holds: it is sent there",
		reshow.ok ? reshow.output.effects : reshow.reason,
		[{ kind: "focus-window", window: "studio-9" }],
	);

	const third = keptPlacesParts(config(), DEFAULT.id);
	const stored = await third.tabs.placedTabs();
	check(
		"what the second run wrote is on disk for the third",
		[stored.tabs.map(({ id }) => id), stored.windows.length],
		[["tab-1", "tab-2", "tab-3", "tab-4", "tab-6"], 0],
	);
}

async function diskFullChecks(): Promise<void> {
	const fake = new FakeStore();
	const failing = { replaces: 0, isFull: false };
	const store = new StoreClient(async (command, args) => {
		if (failing.isFull && command.endsWith("replace")) {
			failing.replaces += 1;
			throw { code: "io", detail: "disk full" };
		}

		return fake.invoke(command, args);
	});
	const parts = keptPlacesParts({ store, apps: BUILT_IN_PLACED_APPS }, DEFAULT.id);
	const stand = standOver(parts.tabs);
	const main = stand.windowOf();
	await main.send(navigation.windows.openWindow, { window: "main" });
	await main.send(navigation.tabOpening.openTab, { at: askAt("main"), app: "canvas" });
	failing.isFull = true;
	const whileFull = await Promise.race([
		main.send(navigation.tabOpening.openTab, { at: askAt("main"), app: "canvas" }),
		new Promise<"hung">((settled) => setTimeout(() => settled("hung"), 5000)),
	]);
	const inMemory = await parts.tabs.placedTabs();
	check(
		"with the disk full a tab still opens and the state in memory stays whole",
		[typeof whileFull === "string" ? whileFull : whileFull.ok, inMemory.tabs.map(({ id }) => id), failing.replaces > 0],
		[true, ["tab-1", "tab-2"], true],
	);
	failing.isFull = false;
	await main.send(navigation.tabOpening.openTab, { at: askAt("main"), app: "canvas" });
	const onDisk = fake.files.get(`${workspaceRootOf(DEFAULT.id)}:navigation.json`)?.["tabs"];
	const diskIds =
		typeof onDisk === "object" && onDisk !== null && "tabs" in onDisk && Array.isArray(onDisk.tabs)
			? onDisk.tabs.map((tab: unknown) => (typeof tab === "object" && tab !== null && "id" in tab ? tab.id : null))
			: onDisk;
	check("when the disk frees up, the next write carries what waited", diskIds, ["tab-1", "tab-2", "tab-3"]);
}

async function syncChecks(): Promise<void> {
	const tabs = new MemoryTabsGateway();
	const stand = standOver(tabs);
	const [writer, reader] = [stand.windowOf(), stand.windowOf()];
	await writer.send(navigation.windows.openWindow, { window: "writer" });
	await reader.send(navigation.windows.openWindow, { window: "reader" });
	const heard = { count: 0 };
	reader.routes.watch(navigation.tabs.sidebar, { at: askAt("reader") }, () => {
		heard.count += 1;
	});
	await reader.send(navigation.tabs.sidebar, { at: askAt("reader") });
	const lags: number[] = [];
	const missed: string[] = [];

	for (let at = 0; at < 100; at += 1) {
		const was = heard.count;
		const sent = performance.now();
		const opened = await writer.send(navigation.tabOpening.openTab, { at: askAt("writer"), app: "canvas" });
		const isHeard = await waitFor(() => heard.count > was, 1000);
		lags.push(performance.now() - sent);
		const sidebar = await reader.send(navigation.tabs.sidebar, { at: askAt("reader") });
		const listed = sidebar.ok
			? sidebar.output.sections.flatMap((section) =>
					section.entries.map((entry) => (entry.kind === "tab" ? entry.tab.id : "")),
				)
			: [];

		if (!isHeard || !opened.ok || !listed.includes(opened.output.id)) {
			missed.push(opened.ok ? opened.output.id : "refused");
		}
	}

	const sorted = [...lags].sort((one, other) => one - other);
	console.log(
		`[sync] 100 opens in one window, the other hears each: p50 ${percentileOf(sorted, 0.5).toFixed(1)} ms, max ${percentileOf(sorted, 1).toFixed(1)} ms`,
	);
	check("100 tabs opened in one window reach the other window's sidebar, none missed", missed, []);

	const windowsHeard = { count: 0 };
	reader.routes.watch(navigation.windows.all, undefined, () => {
		windowsHeard.count += 1;
	});
	await reader.send(navigation.windows.all);
	const was = windowsHeard.count;

	for (let at = 0; at < 20; at += 1) {
		await writer.send(navigation.tabOpening.openTab, { at: askAt("writer"), app: "canvas" });
	}

	await new Promise((settled) => setTimeout(settled, 100));
	const afterTabs = windowsHeard.count - was;
	await writer.send(navigation.windows.openWindow, { window: "third" });
	check(
		"the window list is not re-read on tab changes, only when a window joins or leaves",
		[afterTabs, await waitFor(() => windowsHeard.count - was > afterTabs, 1000)],
		[0, true],
	);
}

function workspaceMoveChecks(): void {
	check(
		"a window that joined another workspace later is left behind in the older one only",
		windowsLeftBehind([
			{ workspace: "a", label: "main", openedAt: 1 },
			{ workspace: "b", label: "main", openedAt: 2 },
			{ workspace: "a", label: "studio-2", openedAt: 1 },
		]),
		[{ workspace: "a", label: "main", openedAt: 1, latest: "b" }],
	);
	check(
		"a window in one workspace is never left behind",
		windowsLeftBehind([
			{ workspace: "a", label: "main", openedAt: 5 },
			{ workspace: "b", label: "studio-2", openedAt: 1 },
		]),
		[],
	);
}

const quiet = { info: console.info, warn: console.warn, error: console.error };
console.info = () => undefined;
console.warn = () => undefined;
console.error = () => undefined;
await sameTabRaceChecks();
await closeRaceChecks();
await navigateOverHeldChecks();
await fuzzChecks();
await restartChecks();
await diskFullChecks();
await syncChecks();
workspaceMoveChecks();
console.info = quiet.info;
console.warn = quiet.warn;
console.error = quiet.error;
console.log(tally.failed ? `places leases: ${tally.failed} check(s) failed` : "places leases: all checks passed");
process.exit(tally.failed ? 1 : 0);
