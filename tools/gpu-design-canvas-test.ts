import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import { commonColourOnRow } from "./gpu-canvas-measure.ts";
import { colourShareIn, distinctColoursIn } from "./gpu-design-canvas-measure.ts";
import { servedGpuPages } from "./gpu-canvas-serve.ts";
import { pageHtml } from "./gpu-design-canvas-html.ts";
import { PAGES, idOf, indexOf, probeOf } from "./gpu-design-canvas-probe.ts";
import { BROKEN_FRAME, DESIGN_FRAMES, KIT_FRAME, TAGS_FRAME, TASKS_FRAME } from "./gpu-design-canvas-frames.ts";
import { BROKEN_SAID } from "./gpu-design-fixture-broken.tsx";
import { HARVEST_TITLE, HOVERED_CROP } from "./gpu-design-fixture-tags.tsx";

const VIEW: readonly [number, number] = [1280, 800];
const WORK_P95_LIMIT_MS = 8;
const BENCH_STEPS = 300;
const FRAMES = DESIGN_FRAMES.length;
const GPU_FRAMES = FRAMES - 1;

const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-gpu-design-canvas"));
mkdirSync(shotsAt, { recursive: true });

let failed = 0;
function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) failed += 1;
	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

const served = await servedGpuPages({ entry: "tools/gpu-design-canvas-page.tsx", html: pageHtml() });
const page = await paged(served.origin, "gpu design canvas", { size: VIEW, onGpu: true });
const { pressToggle, pointOf, regionOf, until, shot } = probeOf(page, shotsAt, check);
try {
	await htmlRun();
	await gpuRun();
	await backToHtml();
} finally {
	page.close();
	served.close();
}
if (failed > 0) console.log(`${failed} check(s) failed; shots in ${shotsAt}`);
else console.log(`gpu design canvas: clean; shots in ${shotsAt}`);
process.exit(failed > 0 ? 1 : 0);

async function htmlRun(): Promise<void> {
	await until(`document.querySelectorAll("[data-canvas-layer] .wg-design-frame").length === ${FRAMES}`);
	await page.ask(`window.designPage.lookAtFrame(${indexOf(TAGS_FRAME)}, 1)`);
	await waited(600);
	check(
		"html: every state is a frame and no canvas is drawn",
		(await page.ask(`document.querySelectorAll("[data-canvas-layer] .wg-design-frame").length`)) === FRAMES &&
			(await page.ask(`document.querySelector("[data-canvas-gpu]") === null`)) === true,
		await page.ask(`document.querySelectorAll("[data-canvas-layer] .wg-design-frame").length`),
	);
	await shot("html-tags");
	await page.ask(`window.designPage.lookAtFrame(${indexOf(KIT_FRAME)}, 1)`);
	await waited(600);
	await shot("html-kit");
}

async function gpuRun(): Promise<void> {
	await pressToggle("GPU");
	await until(`${PAGES}?.work()?.frames === ${GPU_FRAMES}`);
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
	await clicked();
	await hovered();
	await failedFrame();
	await page.ask(`window.designPage.lookAtFrame(${indexOf(KIT_FRAME)}, 1)`);
	await waited(800);
	await shot("gpu-kit");
	console.log(
		`info classes the GPU does not draw — ${JSON.stringify(await page.ask(`${PAGES}.work().unknownClasses`))}`,
	);
	await benched();
	await remembered();
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
	const badge: unknown = await page.ask(
		`[...document.querySelectorAll("[data-canvas-gpu-said]")].map((one) => one.textContent).join("|")`,
	);
	const html: unknown = await page.ask(
		`document.querySelector("[data-canvas-gpu-fallen] [data-canvas-screen]") ? document.querySelector("[data-canvas-gpu-fallen]").textContent : ""`,
	);
	check(
		"gpu: a frame that throws falls back to HTML, listed with its reason",
		typeof listed === "string" &&
			listed.includes(BROKEN_SAID) &&
			typeof badge === "string" &&
			badge.includes(BROKEN_SAID) &&
			typeof html === "string" &&
			html.includes(BROKEN_SAID),
		{ listed, badge, html },
	);
	check(
		"gpu: the other frames still draw",
		(await page.ask(`document.querySelectorAll("[data-canvas-gpu-frame]").length`)) === GPU_FRAMES,
		await page.ask(`document.querySelectorAll("[data-canvas-gpu-frame]").length`),
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

async function remembered(): Promise<void> {
	await page.ask("location.reload()");
	await waited(500);
	await until(`${PAGES}?.work()?.frames === ${GPU_FRAMES}`);
	check(
		"gpu: the choice is remembered for this viewer",
		(await page.ask(`localStorage.getItem("widgetarium.design.page-renderer")`)) === "gpu" &&
			(await page.ask(`document.querySelector("[data-canvas-gpu]") !== null`)) === true,
		await page.ask(`localStorage.getItem("widgetarium.design.page-renderer")`),
	);
}

async function backToHtml(): Promise<void> {
	await pressToggle("HTML");
	await waited(1200);
	const gone = await page.ask(
		`document.querySelector("[data-canvas-gpu]") === null && document.querySelectorAll("[data-canvas-gpu-frame]").length === 0`,
	);
	const frames = await page.ask(
		`document.querySelectorAll("[data-canvas-layer] .wg-design-frame [data-canvas-screen]").length`,
	);
	const live = await page.ask(
		`document.querySelector("[data-canvas-layer]")?.textContent?.includes(${JSON.stringify(HARVEST_TITLE)}) === true`,
	);
	check("html again: today's canvas comes back", gone === true && frames === FRAMES && live === true, {
		gone,
		frames,
		live,
	});
}
