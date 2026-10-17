import { waited } from "./chrome-ask.ts";
import type { AskedPage, PagePoint } from "./chrome-ask.ts";
import type { Check } from "./gpu-design-canvas-probe.ts";

const BESIDE_LIST: PagePoint = [130, 720];
const PANNED_TO: PagePoint = [250, 720];
const SETTLE_TRIES = 30;
const SIDEBAR_STATE = `document.querySelector("[data-canvas-sidebar]").dataset.canvasSidebar`;
const PAGES_VISIBILITY = `getComputedStyle(document.querySelector("[data-canvas-pages]")).visibility`;
const LAYER_LEFT = `document.querySelector("[data-canvas-layer]").getBoundingClientRect().left`;
const TOGGLE = `document.querySelector("[data-canvas-sidebar-toggle]").click()`;
const LAYERS_STATE = `document.querySelector("[data-canvas-layers]")?.dataset.canvasLayers ?? null`;
const REACHES_FIELD = `(() => { const hit = document.elementFromPoint(${BESIDE_LIST.join(", ")}); return hit?.closest("[data-canvas-chrome]") === null && hit?.closest("[data-canvas-field]") !== null; })()`;

export async function checkSidebar(page: AskedPage, check: Check): Promise<void> {
	await openSidebarPassesThrough(page, check);
	await page.ask(TOGGLE);
	const shut = await sidebarSettled(page, "hidden");
	check(
		"sidebar: the toggle closes the sidebar and Pages with it",
		shut.sidebar === "shut" && shut.pages === "hidden",
		shut,
	);
	await page.ask(TOGGLE);
	await sidebarSettled(page, "visible");
}

async function openSidebarPassesThrough(page: AskedPage, check: Check): Promise<void> {
	const open = await sidebarSettled(page, "visible");
	check(
		"sidebar: a fresh canvas shows the sidebar with Pages",
		open.sidebar === "open" && open.pages === "visible",
		open,
	);
	const layers = await settled(page, LAYERS_STATE, "open");
	const reachesField = await page.ask(REACHES_FIELD);
	const moved = await pannedBesideList(page);
	check(
		"sidebar: with it open, a drag on the empty canvas beside its lists reaches the field and pans the camera",
		reachesField === true && Math.abs(moved - (PANNED_TO[0] - BESIDE_LIST[0])) < 2,
		{ layers, reachesField, moved },
	);
}

async function pannedBesideList(page: AskedPage): Promise<number> {
	const before = Number(await page.ask(LAYER_LEFT));
	await dragged(page, BESIDE_LIST, PANNED_TO);
	const moved = Number(await page.ask(LAYER_LEFT)) - before;
	await dragged(page, PANNED_TO, BESIDE_LIST);
	return moved;
}

async function dragged(page: AskedPage, from: PagePoint, to: PagePoint): Promise<void> {
	await page.drag({ from, to, steps: 8, stepMs: 16 });
	await page.release(to);
	await waited(300);
}

async function sidebarSettled(page: AskedPage, pages: string): Promise<{ sidebar: unknown; pages: unknown }> {
	return { pages: await settled(page, PAGES_VISIBILITY, pages), sidebar: await page.ask(SIDEBAR_STATE) };
}

async function settled(page: AskedPage, expression: string, wanted: string): Promise<unknown> {
	for (let tries = 0; tries < SETTLE_TRIES; tries += 1) {
		const now = await page.ask(expression);
		if (now === wanted) {
			return now;
		}

		await waited(100);
	}
	return page.ask(expression);
}
