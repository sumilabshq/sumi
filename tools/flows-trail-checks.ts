import { waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { check } from "./check-helpers.ts";
import { openedFlowRow } from "./flows-tab-checks.ts";

const HEADERS = ".wg-chat-head, .wg-plate-head, .sumi-canvas-top-row";
const BACK = `:is(${HEADERS}) button[aria-label='Back']`;
const FORWARD = `:is(${HEADERS}) button[aria-label='Forward']`;

const ACTIVE_TITLE = ".sumi-flow-strip .sumi-pane-tab[data-active] .sumi-pane-tab-title";
const OPENED_FLOW = "Composer redesign";
const LAST_TAB = "Update docs";
const SETTLE_MS = 900;

interface TrailLook {
	readonly shown: string | null;
	readonly canGoBack: boolean;
	readonly canGoForward: boolean;
}

const trailLooked = `(() => ({
	shown: document.querySelector(${JSON.stringify(ACTIVE_TITLE)})?.textContent ?? null,
	canGoBack: !document.querySelector(${JSON.stringify(BACK)}).disabled,
	canGoForward: !document.querySelector(${JSON.stringify(FORWARD)}).disabled,
}))()`;

async function lookOf(page: AskedPage): Promise<TrailLook> {
	return (await page.ask(trailLooked)) as TrailLook;
}

async function pressed(page: AskedPage, selector: string): Promise<TrailLook> {
	await page.ask(`document.querySelector(${JSON.stringify(selector)}).click()`);
	await waited(SETTLE_MS);
	return lookOf(page);
}

async function keyed(page: AskedPage, key: string): Promise<TrailLook> {
	await page.ask(
		`window.dispatchEvent(new KeyboardEvent("keydown", { key: ${JSON.stringify(key)}, metaKey: true, bubbles: true }))`,
	);
	await waited(SETTLE_MS);
	return lookOf(page);
}

async function tabShown(page: AskedPage, title: string): Promise<TrailLook> {
	await page.ask(
		`[...document.querySelectorAll(".sumi-flow-strip .sumi-pane-tab")].find((tab) => tab.getAttribute("aria-label") === ${JSON.stringify(title)}).click()`,
	);
	await waited(SETTLE_MS);
	return lookOf(page);
}

export async function trailChecks(page: AskedPage, name: string): Promise<void> {
	const start = await lookOf(page);
	check(`${name}: a fresh window has nowhere to go back or forward`, start, {
		...start,
		canGoBack: false,
		canGoForward: false,
	});
	await openedFlowRow(page, OPENED_FLOW);
	const opened = await lookOf(page);
	check(`${name}: opening a Flow offers Back`, [opened.canGoBack, opened.canGoForward], [true, false]);
	const switched = await tabShown(page, LAST_TAB);
	check(`${name}: a tab switch shows the tab`, switched.shown, LAST_TAB);
	check(`${name}: Back returns to the tab shown before`, await pressed(page, BACK), { ...opened, canGoForward: true });
	check(`${name}: Back again returns to the Flow shown before`, await pressed(page, BACK), {
		shown: start.shown,
		canGoBack: false,
		canGoForward: true,
	});
	check(`${name}: ⌘] goes forward into the Flow`, (await keyed(page, "]")).shown, opened.shown);
	check(`${name}: ⌘] goes forward to the tab`, await keyed(page, "]"), {
		shown: LAST_TAB,
		canGoBack: true,
		canGoForward: false,
	});
	check(`${name}: ⌘[ goes back`, (await keyed(page, "[")).shown, opened.shown);
}
