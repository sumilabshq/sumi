import { waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { isRecord } from "./page-dom.ts";
import { KEPT_PAGE } from "./studio-kept-browser.ts";
import { check, keyed, openedTabs, pressed, seenOf } from "./studio-tabs-page.ts";

export const KEPT_PATH = "/kept";
const SHOWN_KEPT = "[data-studio-kept=shown]";
const HEADER_TAB = `${SHOWN_KEPT} [data-app-host-bar] [data-host-tab="{tab}"]`;
const CANVAS_TAB = "tab-1";
const BROWSER_TAB = "tab-2";
const SECOND_CANVAS_TAB = "tab-3";
const KEPT_STATE = `(() => { const page = document.querySelector("[${KEPT_PAGE}]"); const canvas = document.querySelector("[data-canvas-studio]"); return { isSamePage: page !== null && page === window.__KEPT_NODE__, typed: page?.value ?? null, isSameCanvas: canvas !== null && canvas === window.__CANVAS_NODE__, onScreen: window.__PAGE_ON_SCREEN__(), browserKept: document.querySelector("[data-studio-kept-app=browser]") !== null }; })()`;
const TYPED_INTO_PAGE = "kept 42";
const MARKED_SHOWN = `[...document.querySelectorAll(".wg-studio-kept")].map((frame) => ({ app: frame.dataset.studioKeptApp, isShown: frame.dataset.studioKept === "shown", marked: [...frame.querySelectorAll("[data-host-tab][aria-selected=true], [data-host-rail-tab][aria-current], [data-host-list-tab]:has([aria-current])")].map((tab) => (tab.dataset.hostTab ?? tab.dataset.hostRailTab ?? tab.dataset.hostListTab) + ":" + tab.dataset.hostTabApp) }))`;

export async function checksKeptAlive(page: AskedPage): Promise<void> {
	await page.ask(`window.__CANVAS_NODE__ = document.querySelector("[data-canvas-studio]"); true`);
	await switchedTo(page, BROWSER_TAB);
	await page.ask(
		`(() => { const node = document.querySelector("[${KEPT_PAGE}]"); window.__KEPT_NODE__ = node; node.value = ${JSON.stringify(TYPED_INTO_PAGE)}; return true; })()`,
	);
	const shown = await keptStateOf(page);
	check("the shown browser page is on screen to Ink", shown["onScreen"] === true, shown);
	await checksOneShownTab(page, "hidden, browser picked");
	await switchedTo(page, CANVAS_TAB);
	await checksOneShownTab(page, "hidden, canvas picked");
	const away = await keptStateOf(page);
	await openedTabs(page, 1);
	await switchedTo(page, BROWSER_TAB);
	await switchedTo(page, SECOND_CANVAS_TAB);
	await checksOneShownTab(page, "hidden, the second canvas picked from the browser");
	const inkRead = await page.ask("window.__INK_READ__()");
	check(
		"switched away, the browser page stays mounted, is not on screen, and Ink is refused it as tab-not-visible",
		away["isSamePage"] === true && away["onScreen"] === false && inkRead === "tab-not-visible",
		{ ...away, inkRead },
	);
	check("the canvas came back as the same node", away["isSameCanvas"] === true, away);
	await switchedTo(page, BROWSER_TAB);
	const back = await keptStateOf(page);
	check(
		"Browser → Canvas → Browser keeps the same page node and what was typed into it",
		back["isSamePage"] === true && back["typed"] === TYPED_INTO_PAGE && back["onScreen"] === true,
		back,
	);
	const before = (await seenOf(page)).tabCount;
	await keyed(page, "w");
	await checksOneShownTab(page, "hidden, ⌘W closed the shown browser tab");
	const closed = await keptStateOf(page);
	const after = (await seenOf(page)).tabCount;
	check(
		"⌘W closes only the shown browser tab, once, and unmounts its page",
		after === before - 1 && closed["browserKept"] === false && closed["isSamePage"] === false,
		{ before, after, ...closed },
	);
}

export async function checksOneShownTab(page: AskedPage, look: string): Promise<void> {
	const frames = await page.ask(MARKED_SHOWN);
	const all = Array.isArray(frames) ? frames.filter(isRecord) : [];
	const shownApp = all.find((frame) => frame["isShown"] === true)?.["app"];
	const marks = all.map((frame) => JSON.stringify(frame["marked"]));
	check(
		`${look}: every kept frame marks one shown tab, the same one, of the app drawn`,
		all.length > 0 &&
			new Set(marks).size === 1 &&
			all.every(
				(frame) =>
					Array.isArray(frame["marked"]) &&
					frame["marked"].length === 1 &&
					String(frame["marked"][0]).endsWith(`:${String(shownApp)}`),
			),
		all,
	);
}

async function keptStateOf(page: AskedPage): Promise<Record<string, unknown>> {
	const asked = await page.ask(KEPT_STATE);
	if (!isRecord(asked)) throw new Error(`the kept studio answered ${JSON.stringify(asked)}`);
	return asked;
}

async function switchedTo(page: AskedPage, tab: string): Promise<void> {
	await pressed(page, HEADER_TAB.replace("{tab}", tab));
	await waited(200);
}
