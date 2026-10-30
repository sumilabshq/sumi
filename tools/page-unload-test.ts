import { check, tally } from "./check-helpers.ts";
import { standIn } from "./stand-in.ts";
import {
	ASK_KEPT_AGAIN_AFTER_MS,
	LIVE_PAGES_AT_MOST,
	PageUnloader,
	UNLOAD_AFTER_MS,
} from "../packages/domain/browser/gateways/browser-pages/tauri/page-unloader.ts";
import { TauriPage } from "../packages/domain/browser/gateways/browser-pages/tauri/tauri-page.ts";
import { busyReasonIn } from "../packages/domain/browser/gateways/browser-pages/tauri/page-reads.ts";
import type {
	PageLoadEvent,
	PagesBridge,
} from "../packages/domain/browser/gateways/browser-pages/tauri/pages-bridge.ts";

const MINUTE_MS = 60 * 1000;
const ADDRESS = "https://news.example/today";
const CALLS_THROUGH_WAKE = ["create", "navigate", "close", "create", "navigate"];
const LATE_START: PageLoadEvent = {
	kind: "started",
	page: "tab-9",
	failure: null,
	facts: {
		url: ADDRESS,
		title: "Today",
		canGoBack: true,
		canGoForward: false,
		isLoading: true,
		window: "main",
	},
};

interface BoardState {
	readonly clock: { now: number };
	readonly live: string[];
	readonly onScreen: Set<string>;
	readonly busy: Map<string, string>;
	readonly unloaded: string[];
	readonly asked: string[];
}

interface Board extends BoardState {
	readonly unloader: PageUnloader;
}

function boardOf(tabIds: readonly string[]): Board {
	const state = {
		clock: { now: 0 },
		live: [...tabIds],
		onScreen: new Set<string>(),
		busy: new Map<string, string>(),
		unloaded: [],
		asked: [],
	};
	return {
		...state,
		unloader: unloaderOver(state),
	};
}

function unloaderOver({ clock, live, onScreen, busy, unloaded, asked }: BoardState): PageUnloader {
	return new PageUnloader({
		livePages: () => live,
		isShownAnywhere: (tabId) => onScreen.has(tabId),
		refuseUnload: async (tabId) => busyAnswerRecorded(busy, asked, tabId),
		unload: (tabId) => {
			unloaded.push(tabId);
			live.splice(live.indexOf(tabId), 1);
			return true;
		},
		now: () => clock.now,
	});
}

function busyAnswerRecorded(busy: ReadonlyMap<string, string>, asked: string[], tabId: string): string | null {
	const reason = busy.get(tabId) ?? null;
	asked.push(...(reason === null ? [] : [tabId]));
	return reason;
}

function tabsNamed(count: number): string[] {
	return Array.from({ length: count }, (_, at) => `tab-${at + 1}`);
}

async function checksTimeLimit(): Promise<void> {
	const board = boardOf(["shown", "old", "recent"]);
	board.onScreen.add("shown");
	await board.unloader.unloadDuePages();
	board.clock.now = 20 * MINUTE_MS;
	board.onScreen.add("recent");
	await board.unloader.unloadDuePages();
	board.onScreen.delete("recent");
	board.clock.now = UNLOAD_AFTER_MS + MINUTE_MS;
	await board.unloader.unloadDuePages();
	check("a tab hidden for 30 minutes is unloaded, a newer one stays", board.unloaded, ["old"]);
	board.clock.now = 120 * MINUTE_MS;
	await board.unloader.unloadDuePages();
	check("the tab on screen is never unloaded, however long", board.live, ["shown"]);
}

async function checksCap(): Promise<void> {
	const board = boardOf(tabsNamed(LIVE_PAGES_AT_MOST + 2));
	board.onScreen.add("tab-1");
	await board.unloader.unloadDuePages();
	check("over the cap, the oldest hidden tabs are unloaded at once", board.unloaded, ["tab-2", "tab-3"]);
	check("the cap leaves exactly the most live tabs", board.live.length, LIVE_PAGES_AT_MOST);
}

async function checksBusy(): Promise<void> {
	const board = boardOf(tabsNamed(LIVE_PAGES_AT_MOST + 1));
	board.onScreen.add("tab-1");
	board.busy.set("tab-2", "playing media");
	await board.unloader.unloadDuePages();
	check("a busy tab stays live and the next oldest goes instead", board.unloaded, ["tab-3"]);
	board.clock.now = UNLOAD_AFTER_MS + MINUTE_MS;
	await board.unloader.unloadDuePages();
	check("a busy tab stays live past 30 minutes too", board.live.includes("tab-2"), true);
}

function recordingBridge(calls: string[]): PagesBridge {
	const record = (name: string) => async (): Promise<void> => void calls.push(name);
	return standIn<PagesBridge>(
		{
			create: record("create"),
			close: record("close"),
			navigate: record("navigate"),
		},
		["create", "close", "navigate"],
		"pages bridge",
	);
}

async function settled(): Promise<void> {
	for (let turn = 0; turn < 5; turn += 1) {
		await Promise.resolve();
	}
}

async function unloadedPage(calls: string[]): Promise<TauriPage> {
	const page = new TauriPage({
		id: "tab-9",
		bridge: recordingBridge(calls),
		profileId: "default",
		changed: () => {},
	});
	page.wakeIfUnloaded();
	check("a page never unloaded is not woken", calls.length, 0);
	page.open(ADDRESS);
	await settled();
	page.unload();
	await settled();
	return page;
}

async function checksUnloadAndWake(): Promise<void> {
	const calls: string[] = [];
	const page = await unloadedPage(calls);
	check("an unloaded page is no longer live", page.isLive(), false);
	check("an unloaded page keeps its address", page.now().url, ADDRESS);
	page.wakeIfUnloaded();
	await settled();
	check("waking closes first, then creates again and loads the kept address", calls, CALLS_THROUGH_WAKE);
	check("a woken page is live again", page.isLive(), true);
}

async function createdBlankPage(): Promise<TauriPage> {
	const blank = new TauriPage({
		id: "tab-blank",
		bridge: recordingBridge([]),
		profileId: "default",
		changed: () => {},
	});
	await blank.ensureCreated();
	return blank;
}

async function checksUnloadedPageEdges(): Promise<void> {
	const calls: string[] = [];
	check("a page with no address is never unloaded", (await createdBlankPage()).unload(), false);
	const page = await unloadedPage(calls);
	page.apply(LATE_START);
	check("a late event from the closed page changes nothing", page.now().isLoading, false);
	calls.length = 0;
	page.reload();
	await settled();
	check("reloading an unloaded page loads its kept address", calls, ["create", "navigate"]);
}

async function checksBusyAskedAgain(): Promise<void> {
	const board = boardOf(tabsNamed(LIVE_PAGES_AT_MOST + 2));
	board.onScreen.add("tab-1");
	board.busy.set("tab-2", "typed text");
	await board.unloader.unloadDuePages();
	board.clock.now = 10 * 1000;
	board.live.push("tab-11");
	await board.unloader.unloadDuePages();
	check("a kept tab is not asked again within a minute", board.asked, ["tab-2"]);
	board.clock.now = ASK_KEPT_AGAIN_AFTER_MS + 20 * 1000;
	board.live.push("tab-12");
	await board.unloader.unloadDuePages();
	check("a kept tab is asked again after a minute", board.asked, ["tab-2", "tab-2"]);
}

function framesBridge(inPage: string, inFrames: readonly (string | null)[]): PagesBridge {
	return standIn<PagesBridge>(
		{
			evaluate: async () => inPage,
			evaluateInFrames: async () => inFrames.map((answer) => ({ url: "https://frame.example/", answer })),
		},
		["evaluate", "evaluateInFrames"],
		"pages bridge",
	);
}

async function checksBusyAnswers(): Promise<void> {
	check("a page and frames with nothing going on are not busy", await busyReasonIn(framesBridge("", [""]), "t"), null);
	check("typed text in the page keeps it", await busyReasonIn(framesBridge("typed text", []), "t"), "typed text");
	check("a call in a frame keeps the page", await busyReasonIn(framesBridge("", ["in a call"]), "t"), "in a call");
	check(
		"a frame that did not answer keeps the page",
		await busyReasonIn(framesBridge("", [null]), "t"),
		"a frame did not answer",
	);
}

await checksTimeLimit();
await checksCap();
await checksBusy();
await checksUnloadAndWake();
await checksUnloadedPageEdges();
await checksBusyAskedAgain();
await checksBusyAnswers();
console.log(tally.failed ? `page unload: ${tally.failed} check(s) failed` : "page unload: all checks passed");
process.exit(tally.failed ? 1 : 0);
