import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import { waitUntil, waited } from "./chrome-ask.ts";
import type { AskedPage, PagePoint } from "./chrome-ask.ts";
import { check, failureCount } from "./tabs-sidebar-check-kit.ts";
import { openedPage, sidebarPageFile } from "./tabs-sidebar-pages.ts";
import { centreOf } from "./tabs-sidebar-scenes.ts";

const CARRIED = '[data-tabs-item="tab"][data-tabs-chat="chat-translator"]';
const TARGET = '[data-tabs-item="tab"][data-tabs-chat="chat-release"]';
const TARGET_CHILD = '[data-tabs-list="chat-release"] > [data-tabs-item="tab"]';
const SETTLED_MS = 320;
const DRAWN_WAIT_MS = 3000;
const DRAWN_STEP_MS = 100;
const VEIL_SHOWN = `(() => { const veil = document.querySelector("[data-tabs-refusal-hint]"); return veil !== null && !veil.hidden && veil.style.opacity === "1"; })()`;
const ROW_TOP = `document.querySelector(${JSON.stringify(TARGET)}).getBoundingClientRect().top`;
const EDGE_INSET_PX = 3;

type PointOf = (page: AskedPage) => Promise<PagePoint>;

const folder = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-tabs-sidebar-refusal"));
mkdirSync(folder, { recursive: true });
const pageFile = await sidebarPageFile(folder);

async function isVeiledOver(pointOf: PointOf): Promise<boolean> {
	const page = await openedPage(pageFile, [1440, 1000]);
	await waitUntil(
		async () => (await page.ask(`document.querySelector(${JSON.stringify(CARRIED)}) !== null`)) === true,
		DRAWN_WAIT_MS,
		DRAWN_STEP_MS,
	);
	const at = await pointOf(page);
	const from = await centreOf(page, CARRIED);
	const held = await page.lift({ from, to: [from[0], from[1] - 6], steps: 6, stepMs: 16 });
	await held.over(at);
	await waited(SETTLED_MS);
	const isVeiled = z.boolean().parse(await page.ask(VEIL_SHOWN));
	page.close();
	return isVeiled;
}

const rowCentre: PointOf = (page) => centreOf(page, TARGET);
const childCentre: PointOf = (page) => centreOf(page, TARGET_CHILD);
const rowTopEdge: PointOf = async (page) => {
	const [x] = await centreOf(page, TARGET);
	return [x, z.number().parse(await page.ask(ROW_TOP)) + EDGE_INSET_PX];
};

check("a chat carried over another chat's row is refused with the veil", await isVeiledOver(rowCentre), null);
check("a chat carried over another chat's tab is refused with the veil", await isVeiledOver(childCentre), null);
check(
	"a chat carried to the top edge of another chat places above it, no veil",
	!(await isVeiledOver(rowTopEdge)),
	null,
);
process.exit(failureCount() > 0 ? 1 : 0);
