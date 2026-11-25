import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { waited } from "./chrome-ask.ts";
import type { AskedPage, ShotClip } from "./chrome-ask.ts";
import { bundledSidebarPage, hoverOn, openedSidebar } from "./flows-sidebar-harness.ts";
import { boxOf, closeOf, dialogFitOf, IDLE_SESSION, RUNNING_SESSION, SESSION_ROW } from "./close-session-probe.ts";
import type { Box } from "./close-session-probe.ts";

const OUT = process.argv[2] ?? "/tmp/close-shots";
const PIXEL_RATIO = 2;
const PAGE_SIZE = [1000, 640] as const;
const ROW_MARGIN_PX = 8;
const BUTTONS_ZOOM = 4;

function clipAround(box: Box, margin: number, scale: number): ShotClip {
	return { x: box.x - margin, y: box.y - margin, width: box.width + margin * 2, height: box.height + margin * 2, scale };
}

async function shot(page: AskedPage, name: string, clip?: ShotClip): Promise<void> {
	writeFileSync(path.join(OUT, `${name}.png`), await page.shoot(clip));
}

async function shootTheme(bundled: string, theme: string): Promise<void> {
	const opened = await openedSidebar(bundled, theme, "inbox", PAGE_SIZE, PIXEL_RATIO);
	const { page } = opened;

	try {
		await page.reduceMotion();
		await hoverOn(page, SESSION_ROW, IDLE_SESSION, 300);
		const row = await boxOf(page, `${closeOf(IDLE_SESSION)}.closest(".sumi-flows-row")`);
		await shot(page, `row-hover-x-${theme}`, clipAround(row, ROW_MARGIN_PX, 1));
		const close = await boxOf(page, closeOf(IDLE_SESSION));
		await page.hover(close.x + close.width / 2, close.y + close.height / 2);
		await waited(300);
		await shot(page, `row-x-hover-${theme}`, clipAround(row, ROW_MARGIN_PX, 1));
		await hoverOn(page, SESSION_ROW, RUNNING_SESSION, 300);
		const runningClose = await boxOf(page, closeOf(RUNNING_SESSION));
		await page.press(runningClose.x + runningClose.width / 2, runningClose.y + runningClose.height / 2);
		await waited(600);
		const fit = await dialogFitOf(page);
		console.log(theme, JSON.stringify(fit));
		await shot(page, `dialog-${theme}`, clipAround(fit.panel, 40, 1));
		await shot(page, `buttons-${theme}`, clipAround(fit.footer, 6, BUTTONS_ZOOM));
	} finally {
		opened.stop();
	}
}

mkdirSync(OUT, { recursive: true });
const bundled = await bundledSidebarPage();

for (const theme of ["light", "dark"]) {
	await shootTheme(bundled, theme);
}

console.log(`shots in ${OUT}`);
