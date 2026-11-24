import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { AskedPage } from "./chrome-ask.ts";
import { check, tally } from "./check-helpers.ts";
import { TRAFFIC_LIGHTS, bundledSidebarPage, openedSidebar } from "./flows-sidebar-harness.ts";
import { frameLookChecks, nameOf } from "./flows-frame-checks.ts";
import type { FrameState, FrameTheme } from "./flows-frame-checks.ts";
import { FRAME_SPLITS, sceneOf } from "./flows-frame-scenes.ts";
import { crowdedTabChecks, framedAt, hoverChecks, openedFlowRow, roomyTabChecks, tabsOf } from "./flows-tab-checks.ts";
import type { Crowding } from "./flows-tab-checks.ts";
import { BACK, FORWARD, trailChecks } from "./flows-trail-checks.ts";
import { trailLawChecks } from "./window-trail-checks.ts";

const TOGGLE = "button[aria-label='Hide sidebar'], button[aria-label='Show sidebar']";
const FIRST_TAB = ".sumi-flow-strip .sumi-pane-tab";
const NEW_TAB = ".sumi-flow-strip button[aria-label='New tab']";
const TITLE_ROW = ".sumi-title-bar";
const SIDEBAR_COLUMN = ".sumi-flows-column";
const TITLE_GROUP = ".sumi-flows-title";
const BOARD = ".sumi-flow-board";
const HOST_INSETS = "apps/tauri/src/tauri-studio-host.ts";
const HOST_RIGHT_EDGE = /TRAFFIC_LIGHTS_RIGHT_EDGE_PX = (\d+)/;
const TOLERANCE_PX = 0.5;
const EMPTY_STRIP_OFFSET_PX = 40;
const SHOTS_DIR = process.argv[2] ?? null;
const THEMES: readonly FrameTheme[] = ["light", "dark"];
const THREE_TAB_FLOW = "Composer redesign";
const CROWDED_FRAMES: readonly { readonly widthPx: number; readonly crowding: Crowding }[] = [
	{ widthPx: 760, crowding: "shrunk" },
	{ widthPx: 600, crowding: "narrow" },
];

interface Box {
	readonly left: number;
	readonly right: number;
	readonly top: number;
	readonly bottom: number;
	readonly centreY: number;
}

const bundled = await bundledSidebarPage();

const boxOf = (selector: string): string =>
	`(() => { const box = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, centreY: box.top + box.height / 2 }; })()`;

const hitsOwn = (selector: string, own: string): string =>
	`(() => { const box = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)?.closest(${JSON.stringify(own)}) !== null; })()`;

const takesWindowAtEmptyStrip = (): string =>
	`(() => { const strip = document.querySelector(".sumi-flow-strip").getBoundingClientRect(); const at = document.elementFromPoint(strip.right - ${EMPTY_STRIP_OFFSET_PX}, ${TRAFFIC_LIGHTS.centreYPx}); return at !== null && !window.__chrome.hasOwnDrag(at) && !window.__chrome.isControl(at); })()`;

function isCentredOnTrafficLights(box: Box): boolean {
	return Math.abs(box.centreY - TRAFFIC_LIGHTS.centreYPx) <= TOLERANCE_PX;
}

async function inState(scene: string, theme: FrameTheme, run: (page: AskedPage) => Promise<void>): Promise<void> {
	const opened = await openedSidebar(bundled, theme, scene);

	try {
		await run(opened.page);
	} finally {
		opened.stop();
	}
}

async function chromeChecks(page: AskedPage, state: string): Promise<void> {
	const row = (await page.ask(boxOf(TITLE_ROW))) as Box;
	const toggle = (await page.ask(boxOf(TOGGLE))) as Box;
	const tab = (await page.ask(boxOf(FIRST_TAB))) as Box;
	const plus = (await page.ask(boxOf(NEW_TAB))) as Box;
	const board = (await page.ask(boxOf(BOARD))) as Box;
	check(`${state}: the board starts below the title row`, board.top >= row.bottom, true);
	check(`${state}: the title row is centred on the traffic lights`, isCentredOnTrafficLights(row), true);
	check(`${state}: the sidebar toggle is centred on the traffic lights`, isCentredOnTrafficLights(toggle), true);
	check(`${state}: the toggle starts beyond the traffic lights`, toggle.left >= TRAFFIC_LIGHTS.rightEdgePx, true);
	check(`${state}: the first tab is centred on the traffic lights`, isCentredOnTrafficLights(tab), true);
	check(`${state}: the first tab starts after the toggle`, tab.left >= toggle.right, true);
	check(`${state}: the new tab button is centred on the traffic lights`, isCentredOnTrafficLights(plus), true);
	const back = (await page.ask(boxOf(BACK))) as Box;
	const forward = (await page.ask(boxOf(FORWARD))) as Box;
	check(
		`${state}: Back and Forward are centred on the traffic lights`,
		[back, forward].every(isCentredOnTrafficLights),
		true,
	);
	check(`${state}: Back and Forward follow the toggle`, back.left >= toggle.right && forward.left >= back.right, true);
}

async function dockedReachCheck(page: AskedPage): Promise<void> {
	const forward = (await page.ask(boxOf(FORWARD))) as Box;
	const sidebar = (await page.ask(boxOf(SIDEBAR_COLUMN))) as Box;
	const paddingPx = Number(await page.ask(`parseFloat(getComputedStyle(document.querySelector(${JSON.stringify(TITLE_GROUP)})).paddingInlineEnd)`));
	check("docked: Forward ends at the sidebar right edge minus the padding", Math.abs(forward.right - (sidebar.right - paddingPx)) <= TOLERANCE_PX, true);
}

async function hiddenReachCheck(page: AskedPage): Promise<void> {
	const toggle = (await page.ask(boxOf(TOGGLE))) as Box;
	const back = (await page.ask(boxOf(BACK))) as Box;
	const forward = (await page.ask(boxOf(FORWARD))) as Box;
	const pen = (await page.ask(boxOf("button[aria-label='New flow']"))) as Box;
	check("hidden: the pen, Back and Forward are visible after the toggle", [pen, back, forward].every((box) => box.left >= toggle.right && box.right > box.left), true);
}

async function pressChecks(page: AskedPage, state: string): Promise<void> {
	check(
		`${state}: a tab under the title bar takes the press`,
		await page.ask(hitsOwn(FIRST_TAB, ".sumi-pane-tab")),
		true,
	);
	check(`${state}: the new tab button takes the press`, await page.ask(hitsOwn(NEW_TAB, NEW_TAB)), true);
	check(`${state}: the toggle takes the press`, await page.ask(hitsOwn(TOGGLE, TOGGLE)), true);
	check(`${state}: an empty spot of the title row drags the window`, await page.ask(takesWindowAtEmptyStrip()), true);
}

trailLawChecks();
const hostSource = readFileSync(path.join(import.meta.dirname, "..", HOST_INSETS), "utf8");
check(
	"the host's left inset is the right edge of the traffic lights in tauri.conf.json",
	Number(HOST_RIGHT_EDGE.exec(hostSource)?.[1]),
	TRAFFIC_LIGHTS.rightEdgePx,
);
await inState("inbox+board", "light", async (page) => {
	await chromeChecks(page, "docked");
	await dockedReachCheck(page);
	await pressChecks(page, "docked");
});
await inState("hidden+board", "light", async (page) => {
	await chromeChecks(page, "hidden");
	await hiddenReachCheck(page);
	await pressChecks(page, "hidden");
});

if (SHOTS_DIR !== null) {
	mkdirSync(SHOTS_DIR, { recursive: true });
}

for (const theme of THEMES) {
	for (const isDocked of [true, false]) {
		for (const split of FRAME_SPLITS) {
			const state: FrameState = { theme, isDocked, split };
			await inState(sceneOf(isDocked ? "inbox" : "hidden", split), theme, async (page) => {
				const look = await frameLookChecks(page, state, SHOTS_DIR);
				console.log(`   ${nameOf(state)} measured ${JSON.stringify(look.panel)}`);
			});
		}
	}
}

async function shot(page: AskedPage, name: string): Promise<void> {
	if (SHOTS_DIR !== null) {
		writeFileSync(path.join(SHOTS_DIR, `${name}.png`), await page.shoot());
	}
}

for (const theme of THEMES) {
	await inState("inbox+board", theme, async (page) => {
		roomyTabChecks(await tabsOf(page), `${theme}, one tab`, 1);
		await hoverChecks(page, `${theme}, one tab`);
		await shot(page, `${theme}-tabs-one`);
		await openedFlowRow(page, THREE_TAB_FLOW);
		roomyTabChecks(await tabsOf(page), `${theme}, three tabs`, 3);
		await hoverChecks(page, `${theme}, three tabs`);
		await shot(page, `${theme}-tabs-three`);

		for (const { widthPx, crowding } of CROWDED_FRAMES) {
			await framedAt(page, widthPx);
			crowdedTabChecks(await tabsOf(page), `${theme}, crowded at ${widthPx}px`, crowding);
			await hoverChecks(page, `${theme}, crowded at ${widthPx}px`);
			await shot(page, `${theme}-tabs-crowded-${widthPx}`);
		}
	});
}

await inState("inbox+board", "light", async (page) => trailChecks(page, "docked trail"));

console.log(tally.failed ? `flows chrome: ${tally.failed} check(s) failed` : "flows chrome: all checks passed");
process.exit(tally.failed ? 1 : 0);
