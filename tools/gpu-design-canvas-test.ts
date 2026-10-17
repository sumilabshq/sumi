import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { bodyLockFindingsOf, leavesWindowAlone } from "./body-lock-checks.ts";
import { paged, waited } from "./chrome-ask.ts";
import { commonColourOnRow } from "./gpu-canvas-measure.ts";
import { colourShareIn, distinctColoursIn } from "./gpu-design-canvas-measure.ts";
import { servedGpuPages } from "./gpu-canvas-serve.ts";
import { pageHtml } from "./gpu-design-canvas-html.ts";
import { PAGES, idOf, indexOf, probeOf } from "./gpu-design-canvas-probe.ts";
import { BROKEN_FRAME, DESIGN_FRAMES, KIT_FRAME, TAGS_FRAME, TASKS_FRAME } from "./gpu-design-canvas-frames.ts";
import { BROKEN_SAID } from "./gpu-design-fixture-broken.tsx";
import { checkSidebar } from "./gpu-design-canvas-sidebar.ts";
import { checkTopBar } from "./gpu-design-canvas-top-bar.ts";
import { HARVEST_TITLE, HOVERED_CROP } from "./gpu-design-fixture-tags.tsx";

const VIEW: readonly [number, number] = [1280, 800];
const WORK_P95_LIMIT_MS = 8;
const BENCH_STEPS = 300;
const SETTLED_MS = 2000;
const FPS_LABEL = `document.querySelector("[data-canvas-fps]")?.textContent ?? null`;
const DRAWING_FPS = /^([1-9]\d*) FPS$/;
const FPS_TOLERANCE = 0.25;
const RAF_RATE = `new Promise((done) => { const stamps = []; const tick = (now) => { stamps.push(now); if (now - stamps[0] < 500) requestAnimationFrame(tick); else done(Math.round((1000 * (stamps.length - 1)) / (now - stamps[0]))); }; requestAnimationFrame(tick); })`;
const FRAMES = DESIGN_FRAMES.length;
const GPU_FRAMES = FRAMES - 1;
const CARD_FRAME = "window.designPage.cardFrameId";

const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-gpu-design-canvas"));
mkdirSync(shotsAt, { recursive: true });

let failed = 0;
function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) failed += 1;
	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

const served = await servedGpuPages({ entry: "tools/gpu-design-canvas-page.tsx", html: pageHtml() });
const page = await paged(served.origin, "gpu design canvas", { size: VIEW, onGpu: true });
const { pointOf, regionOf, until, shot } = probeOf(page, shotsAt, check);
try {
	await gpuRun();
} finally {
	page.close();
	served.close();
}
if (failed > 0) console.log(`${failed} check(s) failed; shots in ${shotsAt}`);
else console.log(`gpu design canvas: clean; shots in ${shotsAt}`);
process.exit(failed > 0 ? 1 : 0);

async function gpuRun(): Promise<void> {
	await until(`${PAGES}?.work()?.frames === ${GPU_FRAMES}`);
	check(
		"gpu: every state is a frame, drawn on the GPU with no HTML screen",
		(await page.ask(`document.querySelectorAll("[data-canvas-layer] .wg-design-frame").length`)) === FRAMES &&
			(await page.ask(`document.querySelectorAll("[data-canvas-screen]").length`)) === 0,
		await page.ask(`document.querySelectorAll("[data-canvas-layer] .wg-design-frame").length`),
	);
	await waited(800);
	await page.ask(`window.designPage.lookAtFrame(${indexOf(TAGS_FRAME)}, 1)`);
	await waited(800);
	const tags = await shot("gpu-tags");
	const region = await regionOf(TAGS_FRAME);
	check(
		"gpu: a frame draws pixels of its own",
		distinctColoursIn(tags, region) > 12 && colourShareIn(tags, region, [255, 255, 255]) > 0.3,
		{
			colours: distinctColoursIn(tags, region),
			white: colourShareIn(tags, region, [255, 255, 255]),
		},
	);
	check(
		"gpu: the fixture's text is in the scene",
		(await page.ask(`${PAGES}.textIn(${idOf(TAGS_FRAME)}, "Harvest")`)) === HARVEST_TITLE,
		await page.ask(`${PAGES}.textIn(${idOf(TAGS_FRAME)}, "Harvest")`),
	);
	check(
		"gpu: a kit widget's rows are in the scene",
		(await page.ask(`${PAGES}.textIn(${idOf(TASKS_FRAME)}, "beans")`)) === "Sow the beans",
		await page.ask(`${PAGES}.textIn(${idOf(TASKS_FRAME)}, "beans")`),
	);
	await checkTopBar(page, check);
	await checkSidebar(page, check);
	await clicked();
	await hovered();
	await failedFrame();
	await dialogFrame();
	await page.ask(`window.designPage.lookAtFrame(${indexOf(KIT_FRAME)}, 1)`);
	await waited(800);
	await shot("gpu-kit");
	console.log(
		`info classes the GPU does not draw — ${JSON.stringify(await page.ask(`${PAGES}.work().unknownClasses`))}`,
	);
	await benched();
	await frameRateShown();
	await componentCard();
}

async function clicked(): Promise<void> {
	const before = await page.ask(`${PAGES}.textIn(${idOf(TAGS_FRAME)}, "Picked")`);
	const point = await pointOf(TAGS_FRAME, "Picked 0");
	if (point) await page.press(point[0], point[1]);
	await waited(500);
	const after = await page.ask(`${PAGES}.textIn(${idOf(TAGS_FRAME)}, "Picked")`);
	check("gpu: a real click inside a frame changes its state", before === "Picked 0" && after === "Picked 1", {
		point,
		before,
		after,
	});
}

async function hovered(): Promise<void> {
	await page.hover(4, 400);
	await waited(400);
	const row = await pointOf(TAGS_FRAME, HOVERED_CROP);
	const region = await regionOf(TAGS_FRAME);
	const y = row?.[1] ?? 0;
	const resting = commonColourOnRow(await shot("gpu-row-resting"), y, region.left, region.left + region.width);
	if (row) await page.hover(row[0], row[1]);
	await waited(500);
	const lit = commonColourOnRow(await shot("gpu-row-hovered"), y, region.left, region.left + region.width);
	check("gpu: hover repaints the row under the pointer", row !== null && resting.join() !== lit.join(), {
		row,
		resting,
		lit,
	});
}

async function failedFrame(): Promise<void> {
	const listed: unknown = await page.ask(`${PAGES}.failureOf(${idOf(BROKEN_FRAME)}) ?? null`);
	const marker: unknown = await page.ask(
		`[...document.querySelectorAll("[data-canvas-not-drawn]")].map((one) => one.textContent).join("|")`,
	);
	check(
		"gpu: a frame that throws shows a marker with its reason, never a picture or HTML",
		typeof listed === "string" &&
			listed.includes(BROKEN_SAID) &&
			typeof marker === "string" &&
			marker.includes(BROKEN_SAID) &&
			(await page.ask(`document.querySelectorAll("[data-canvas-screen], img[data-canvas-picture]").length`)) === 0,
		{ listed, marker },
	);
	check(
		"gpu: the other frames still draw",
		(await page.ask(`document.querySelectorAll("[data-canvas-gpu-frame]").length`)) === GPU_FRAMES,
		await page.ask(`document.querySelectorAll("[data-canvas-gpu-frame]").length`),
	);
}

async function dialogFrame(): Promise<void> {
	await waited(800);
	const found = await bodyLockFindingsOf(page);
	check(
		"gpu: an open dialog state leaves the window's pointer, scroll, focus and readers alone",
		leavesWindowAlone(found),
		found,
	);
}

async function benched(): Promise<void> {
	await page.ask(`window.designPage.lookAtFrame(0, 0.3)`);
	await waited(800);
	await page.ask(`${PAGES}.work()`);
	await page.ask(`window.designPage.panBench(${BENCH_STEPS})`);
	const cold: unknown = await page.ask(`${PAGES}.work().work`);
	await page.ask(`window.designPage.panBench(${BENCH_STEPS})`);
	const warm: unknown = await page.ask(`${PAGES}.work().work`);
	const p95 = typeof warm === "object" && warm !== null && "p95Ms" in warm ? Number(warm.p95Ms) : Number.NaN;
	check(
		`gpu: pan and zoom over ${FRAMES} frames keep work p95 under ${WORK_P95_LIMIT_MS} ms`,
		p95 < WORK_P95_LIMIT_MS,
		{ cold, warm },
	);
}

async function frameRateShown(): Promise<void> {
	await page.ask(`window.designPage.panBench(${BENCH_STEPS})`);
	await waited(SETTLED_MS);
	const idle = fpsIn(await page.ask(FPS_LABEL));
	const display = Number(await page.ask(RAF_RATE));
	check(
		"gpu: the FPS label counts frames the GPU finished and reads the display rate once idle",
		idle !== null && idle > 0 && Math.abs(idle - display) <= display * FPS_TOLERANCE,
		{ idle, display },
	);
}

function fpsIn(label: unknown): number | null {
	const shown = typeof label === "string" ? DRAWING_FPS.exec(label) : null;
	return shown ? Number(shown[1]) : null;
}

async function componentCard(): Promise<void> {
	await page.ask(
		`[...document.querySelectorAll("[data-canvas-topbar] button")].find((one) => one.textContent.trim() === "Components")?.click()`,
	);
	await until(`${PAGES}.textIn(${CARD_FRAME}, "beans") !== null`);
	const drawn = await page.ask(`${PAGES}.textIn(${CARD_FRAME}, "beans")`);
	check("gpu: a widget card on the Components page draws its state's props", drawn === "Sow the beans", drawn);
}
