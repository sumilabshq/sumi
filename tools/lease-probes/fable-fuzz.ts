import {
	askAt,
	chatFacts,
	displayedBy,
	doubleDisplaysOf,
	navigation,
	quietly,
	tabGroups,
	worldOver,
} from "./fable-harness.ts";
import type { PlacedTabs, Runtime } from "./fable-harness.ts";

const SEEDS = Number(process.argv[2] ?? 40);
const STEPS = Number(process.argv[3] ?? 400);
const LABELS = ["main", "studio-2", "studio-3"];
const APPS = ["canvas", "browser", "tasks"];
const ACTS_UNJOINED = process.argv[4] === "unjoined";
const SIDES = ["left", "right", "top", "bottom"] as const;

function randomOf(seed: number): () => number {
	const state = { now: seed >>> 0 };
	return () => {
		state.now = (state.now + 0x6d2b79f5) >>> 0;
		const mixed = Math.imul(state.now ^ (state.now >>> 15), 1 | state.now);
		const again = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
		return ((again ^ (again >>> 14)) >>> 0) / 4294967296;
	};
}

interface Op {
	readonly name: string;
	readonly isWindowOp: boolean;
	run(): Promise<{ ok: boolean; reason?: string }>;
}

function opOf(random: () => number, placed: PlacedTabs, window: string, app: Runtime): Op {
	const pick = <T>(items: readonly T[]): T | undefined => items[Math.floor(random() * items.length)];
	const tabId = pick(placed.tabs)?.id ?? "tab-none";
	const otherId = pick(placed.tabs)?.id ?? "tab-none";
	const groupId = pick(placed.groups)?.id ?? "group-none";
	const closedId = pick(placed.closed)?.tab.id ?? null;
	const at = askAt(window, { canOpenOwnWindow: random() < 0.5, isBrowserAvailable: true });
	const tabOps: readonly [string, () => Promise<{ ok: boolean; reason?: string }>][] = [
		[
			"openTab",
			() =>
				app.send(navigation.tabOpening.openTab, {
					at,
					app: pick(APPS) ?? "canvas",
					show: random() < 0.8,
					reusesHeld: random() < 0.3,
				}),
		],
		["openTab", () => app.send(navigation.tabOpening.openTab, { at, app: pick(APPS) ?? "canvas" })],
		["show", () => app.send(navigation.tabShowing.show, { at, id: tabId })],
		["show", () => app.send(navigation.tabShowing.show, { at, id: tabId })],
		["show", () => app.send(navigation.tabShowing.show, { at, id: tabId })],
		["showFollowingFocus", () => app.send(navigation.tabShowing.show, { at, id: tabId, isFollowingFocus: true })],
		["closeTab", () => app.send(navigation.tabClosing.closeTab, { at, id: tabId })],
		["closeOthers", () => app.send(navigation.tabClosing.closeOthers, { at, id: tabId })],
		["closeShown", () => app.send(navigation.tabClosing.closeShown, { at })],
		["closeGroup", () => app.send(navigation.tabClosing.closeGroup, { at, id: groupId })],
		[
			"placeInView",
			() =>
				app.send(navigation.splits.placeInView, {
					at,
					tabId,
					targetTabId: random() < 0.7 ? otherId : null,
					side: pick(SIDES) ?? "left",
					isPaneMoved: random() < 0.3,
				}),
		],
		[
			"placeInView",
			() => app.send(navigation.splits.placeInView, { at, tabId, targetTabId: otherId, side: pick(SIDES) ?? "left" }),
		],
		["splitRemove", () => app.send(navigation.splits.remove, { at, tabId })],
		[
			"reorderMember",
			() => app.send(navigation.splits.reorderMember, { at, tabId, before: random() < 0.5 ? otherId : null }),
		],
		["tearOff", () => app.send(navigation.tabShowing.tearOff, { at, id: tabId })],
		["openInOwnWindow", () => app.send(navigation.tabShowing.openInOwnWindow, { at, id: tabId })],
		[
			"reopenClosed",
			() => app.send(navigation.tabOpening.reopenClosed, { at, tabId: random() < 0.5 ? closedId : null }),
		],
		[
			"openOnce",
			() => app.send(navigation.tabOpening.openOnce, { at, id: `once-${Math.floor(random() * 3)}`, app: "canvas" }),
		],
		[
			"navigateTab",
			() =>
				app.send(navigation.tabOpening.navigate, {
					at,
					target: { kind: "tab", id: tabId, isMoved: random() < 0.5 },
					where: random() < 0.5 ? "this-tab" : "new-tab",
					from: random() < 0.7 ? otherId : null,
				}),
		],
		[
			"navigateApp",
			() =>
				app.send(navigation.tabOpening.navigate, {
					at,
					target: { kind: "app", app: pick(APPS) ?? "canvas" },
					where: random() < 0.5 ? "this-tab" : "new-tab",
					from: random() < 0.7 ? otherId : null,
				}),
		],
		["duplicate", () => app.send(navigation.tabOpening.duplicate, { at, id: tabId })],
		["openBelow", () => app.send(navigation.tabOpening.openBelow, { at, id: tabId })],
		[
			"restore",
			() => app.send(navigation.tabShowing.restore, { at, isBeside: random() < 0.2, keepsPages: random() < 0.5 }),
		],
		["rememberPages", () => app.send(navigation.tabShowing.rememberPages, { at })],
		["fitToPanes", () => app.send(navigation.tabShowing.fitToPanes, { at })],
		["showView", () => app.send(navigation.tabShowing.showView, { window, view: pick(["app", ...APPS]) ?? "app" })],
		[
			"place",
			() =>
				app.send(navigation.tabPlacing.place, {
					at,
					id: tabId,
					place: {
						list: "workspace",
						groupId: random() < 0.4 ? groupId : null,
						before: random() < 0.5 ? otherId : null,
					},
				}),
		],
		["rename", () => app.send(navigation.tabPlacing.rename, { window, id: tabId, label: "x" })],
		["groupCreate", () => app.send(tabGroups.groups.create, { window, from: { kind: "tab", tabId } })],
		["groupUngroup", () => app.send(tabGroups.groups.ungroup, { window, id: groupId })],
		[
			"groupPlace",
			() =>
				app.send(tabGroups.groups.place, {
					window,
					id: groupId,
					place: { list: "workspace", before: random() < 0.5 ? otherId : null },
				}),
		],
		[
			"keepChatTabs",
			() =>
				app.send(chatFacts.turns.keepChatTabs, {
					chats: [{ id: "chat-a", title: null }, ...(random() < 0.5 ? [{ id: "chat-b", title: null }] : [])],
				}),
		],
		["goBack", () => app.send(navigation.tabHistory.goBack, { id: tabId })],
	];
	const windowOps: readonly [string, () => Promise<{ ok: boolean; reason?: string }>][] = [
		["openWindow", () => app.send(navigation.windows.openWindow, { window })],
		["closeWindow", () => app.send(navigation.windows.closeWindow, { window })],
	];

	const isJoined = placed.windows.some(({ label }) => label === window);

	if (!isJoined && !ACTS_UNJOINED) {
		return { name: "openWindow", isWindowOp: true, run: windowOps[0]![1] };
	}

	if (random() < 0.04) {
		const [name, run] = pick(windowOps) ?? windowOps[0]!;
		return { name, isWindowOp: true, run };
	}

	const [name, run] = pick(tabOps) ?? tabOps[0]!;
	return { name, isWindowOp: false, run };
}

function splitsWith(placed: PlacedTabs, ids: readonly string[]): string {
	return JSON.stringify(
		placed.splits
			.filter((split) => split.memberIds.some((id) => ids.includes(id)))
			.map((split) => ({ ...split, focusedId: null })),
	);
}

function breaksBy(was: PlacedTabs, now: PlacedTabs, actor: string): readonly string[] {
	const joined = was.windows.map(({ label }) => label).filter((label) => label !== actor);
	const kept = new Set(now.tabs.map(({ id }) => id));
	return joined.flatMap((other) => {
		const before = displayedBy(was, other);
		const after = displayedBy(now, other);
		const closed = before.filter((id) => !kept.has(id)).map((id) => `closed ${id} that ${other} displays`);
		const undisplayed = before
			.filter((id) => kept.has(id) && !after.includes(id))
			.map((id) => `took ${id} off the screen of ${other}`);
		const gained = after.filter((id) => !before.includes(id)).map((id) => `put ${id} on the screen of ${other}`);
		const resplit = splitsWith(was, before) === splitsWith(now, before) ? [] : [`changed a split ${other} displays`];
		return [...closed, ...undisplayed, ...gained, ...resplit];
	});
}

const found = new Map<string, string>();
const counts = { ops: 0, accepted: 0 };
const loud = quietly();

for (let seed = 1; seed <= SEEDS; seed += 1) {
	const random = randomOf(seed);
	const world = worldOver();
	const apps = new Map(LABELS.map((label) => [label, world.win()] as const));
	const trace: string[] = [];

	for (const label of LABELS) {
		await apps.get(label)?.send(navigation.windows.openWindow, { window: label });
		await new Promise((waited) => setTimeout(waited, 2));
	}

	for (let step = 0; step < STEPS; step += 1) {
		const window = LABELS[Math.floor(random() * LABELS.length)] ?? "main";
		const app = apps.get(window);

		if (app === undefined) {
			continue;
		}

		const was = await world.tabs.placedTabs();
		const op = opOf(random, was, window, app);
		const answered = await op.run();
		const now = await world.tabs.placedTabs();
		counts.ops += 1;
		counts.accepted += answered.ok ? 1 : 0;
		trace.push(`${window}.${op.name}${answered.ok ? "" : " refused"}`);
		const joinedNow = now.windows.map(({ label }) => label);
		const doubles = doubleDisplaysOf(now, joinedNow).map(() => "one tab displayed by two joined windows");
		const wasDouble = doubleDisplaysOf(was, Object.keys(was.views)).length > 0;
		const everyone = wasDouble
			? []
			: doubleDisplaysOf(now, Object.keys(now.views)).map(
					() => "one tab newly displayed by two windows, one not joined",
				);
		const isActorJoined = was.windows.some(({ label }) => label === window);
		const breaks = op.isWindowOp
			? []
			: breaksBy(was, now, window).map((broken) =>
					broken.replace(/tab-\d+|once-\d+|chat-\w+/g, "<tab>").replace(/studio-\d|main/g, "<window>"),
				);

		for (const kind of [...new Set([...doubles, ...(doubles.length === 0 ? everyone : []), ...breaks])]) {
			const key = `${op.name}${isActorJoined ? "" : " by a window not joined"}: ${kind}`;

			if (!found.has(key)) {
				found.set(key, `seed ${seed} step ${step}: … ${trace.slice(-6).join(" → ")}`);
			}
		}
	}
}

loud();
console.log(`fuzz: ${SEEDS} seeds x ${STEPS} steps, ${counts.ops} ops, ${counts.accepted} accepted`);
for (const [kind, where] of [...found].sort()) {
	console.log(`BUG   ${kind}\n        first at ${where}`);
}
console.log(found.size === 0 ? "fuzz: no invariant broke" : `fuzz: ${found.size} kinds of break`);
process.exit(0);
