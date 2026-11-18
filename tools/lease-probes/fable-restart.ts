import { FakeStore } from "../host-tauri-fake-store.ts";
import { check, tally } from "../check-helpers.ts";
import { askAt, breaksOf, coreOn, diskTabs, holdersSaid, navigation, silent } from "./fable-kit.ts";
import type { Core } from "./fable-kit.ts";

const WS = "11111111-1111-4111-8111-111111111111";

async function seeded(fake: FakeStore): Promise<Core> {
	const core = coreOn(fake.invoke, WS);
	const main = core.window();
	const side = core.window();
	await main.send(navigation.windows.openWindow, { window: "main" });
	await side.send(navigation.windows.openWindow, { window: "studio-2" });
	await main.send(navigation.tabOpening.openTab, { at: askAt("main", WS), app: "canvas" });
	await main.send(navigation.tabOpening.openTab, { at: askAt("main", WS), app: "canvas" });
	await side.send(navigation.tabOpening.openTab, { at: askAt("studio-2", WS), app: "canvas" });
	await side.send(navigation.tabOpening.openTab, { at: askAt("studio-2", WS), app: "canvas" });
	return core;
}

async function everyTabShownAndClosedBy(core: Core, label: string): Promise<readonly string[]> {
	const window = core.window();
	await window.send(navigation.windows.openWindow, { window: label });
	const placed = await window.send(navigation.tabs.placedTabs, { window: askAt(label, WS).window });
	const ids = placed.ok ? placed.output.tabs.map(({ id }) => id) : [];
	const failures: string[] = [];

	for (const id of ids) {
		const shown = await window.send(navigation.tabShowing.show, { at: askAt(label, WS), id });

		if (!shown.ok) {
			failures.push(`show ${id}: ${shown.reason}`);
		} else if (shown.output.effects.some((effect) => effect.kind === "focus-window")) {
			failures.push(`show ${id}: sent to another window`);
		}
	}

	for (const id of ids) {
		const closed = await window.send(navigation.tabClosing.closeTab, { at: askAt(label, WS), id });

		if (!closed.ok) {
			failures.push(`close ${id}: ${closed.reason}`);
		}
	}

	return failures;
}

async function quitChecks(): Promise<void> {
	const fake = new FakeStore();
	const core = await seeded(fake);
	const before = diskTabs(fake, WS);
	const leaver = core.window();
	await leaver.send(navigation.windows.closeWindow, { window: "main" });
	await leaver.send(navigation.windows.closeWindow, { window: "studio-2" });
	const afterQuit = diskTabs(fake, WS);
	check(
		"quit: every tab is on disk after both windows left",
		afterQuit?.tabs.map(({ id }) => id),
		["tab-1", "tab-2", "tab-3", "tab-4"],
	);
	check(
		"quit: the views of the windows before quitting",
		Object.fromEntries(Object.entries(before?.views ?? {}).map(([w, v]) => [w.split("@")[0], v.shownId])),
		{
			main: "tab-2",
			"studio-2": "tab-4",
		},
	);
	check(
		"quit: OBSERVED the views left on disk after a clean quit (what each window showed is forgotten)",
		Object.keys(afterQuit?.views ?? {}),
		[],
	);

	const restarted = coreOn(fake.invoke, WS);
	const again = restarted.window();
	await again.send(navigation.windows.openWindow, { window: "main" });
	const view = await again.send(navigation.tabs.placedTabs, { window: askAt("main", WS).window });
	check("quit+start: the tabs are all there for the new main", view.ok ? view.output.tabs.length : view.reason, 4);
	check("quit+start: OBSERVED main shows after restart", view.ok ? view.output.shownId : view.reason, null);
	const disk = diskTabs(fake, WS);
	check("quit+start: nothing is held but by main", disk === null ? null : holdersSaid(disk), {});
	check(
		"quit+start: a new window shows and closes every tab",
		await everyTabShownAndClosedBy(restarted, "studio-7"),
		[],
	);
	check("quit+start: no law broken at the end", breaksOf(diskTabs(fake, WS) ?? before!), []);
}

async function crashChecks(): Promise<void> {
	const fake = new FakeStore();
	await seeded(fake);
	const crashed = diskTabs(fake, WS);
	check(
		"crash: the joined windows are still on disk",
		crashed?.windows.map(({ label }) => label),
		["main", "studio-2"],
	);
	check("crash: tabs held on disk at the crash", crashed === null ? null : Object.keys(holdersSaid(crashed)).sort(), [
		"tab-2",
		"tab-4",
	]);

	const restarted = coreOn(fake.invoke, WS);
	const first = restarted.window();
	const read = await first.send(navigation.windows.all);
	check("crash+start: no window is joined after the cold start", read.ok ? read.output.windows : read.reason, []);
	const disk = diskTabs(fake, WS);
	check("crash+start: and the file says so", disk?.windows, []);
	check("crash+start: no tab is held", disk === null ? null : holdersSaid(disk), {});
	check(
		"crash+start: every tab survived",
		disk?.tabs.map(({ id }) => id),
		["tab-1", "tab-2", "tab-3", "tab-4"],
	);
	check(
		"crash+start: OBSERVED the stale views survive the crash (unlike a quit)",
		Object.keys(disk?.views ?? {}).map((w) => w.split("@")[0]),
		["main", "studio-2"],
	);

	const stranger = restarted.window();
	await stranger.send(navigation.windows.openWindow, { window: "studio-9" });
	const taken = await stranger.send(navigation.tabShowing.show, { at: askAt("studio-9", WS), id: "tab-2" });
	check(
		"crash+start: a new window takes the tab the crashed main showed",
		taken.ok ? taken.output.effects : taken.reason,
		[],
	);
	await first.send(navigation.windows.openWindow, { window: "main" });
	const both = diskTabs(fake, WS);
	check(
		"crash+start: main joining later does not take it back",
		both === null ? null : holdersSaid(both)["tab-2"]?.split("@")[0],
		"studio-9",
	);
	check("crash+start: and no tab shows in two joined windows", both === null ? null : breaksOf(both), []);
	const mainView = await first.send(navigation.tabs.placedTabs, { window: askAt("main", WS).window });
	check(
		"crash+start: main's own shown tab was cleared, not doubled",
		mainView.ok ? mainView.output.shownId : mainView.reason,
		null,
	);
	await first.send(navigation.windows.closeWindow, { window: "main" });
	await stranger.send(navigation.windows.closeWindow, { window: "studio-9" });
	check(
		"crash+start: a new window shows and closes every tab",
		await everyTabShownAndClosedBy(restarted, "studio-7"),
		[],
	);
}

async function keepLiveAtStartChecks(): Promise<void> {
	const fake = new FakeStore();
	await seeded(fake);
	const restarted = coreOn(fake.invoke, WS);
	const core = restarted.window();
	await core.send(navigation.windows.keepLiveWindows, { windows: ["core"] });
	const disk = diskTabs(fake, WS);
	check(
		"crash+start: OBSERVED when the core checks live windows before the studio window exists, the crashed windows' views are dropped",
		Object.keys(disk?.views ?? {}),
		[],
	);
}

async function unflushedCrashChecks(): Promise<void> {
	const fake = new FakeStore();
	const core = await seeded(fake);
	const main = core.window();
	const opened = await main.send(navigation.tabOpening.openTab, { at: askAt("main", WS), app: "canvas" });
	const disk = diskTabs(fake, WS);
	check(
		"a command that answered ok is on disk when it answers (no 400 ms window to lose it)",
		[opened.ok, disk?.tabs.length],
		[true, 5],
	);
}

const { logs } = await silent(async () => {
	await quitChecks();
	await crashChecks();
	await keepLiveAtStartChecks();
	await unflushedCrashChecks();
});
const errors = logs.filter((line) => line.startsWith("error"));
check("no error was logged", errors, []);
console.log(tally.failed ? `fable-restart: ${tally.failed} check(s) differ` : "fable-restart: all as expected");
process.exit(0);
