import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import {
	commonColourOnRow,
	distinctColours,
	edgeSharpness,
	lightShare,
	themeWordsMissing,
} from "./gpu-canvas-measure.ts";
import { servedGpuPages } from "./gpu-canvas-serve.ts";
import { pixelsOfPng } from "./png-pixels.ts";
import type { Pixels } from "./png-pixels.ts";

const VIEW: readonly [number, number] = [1280, 800];
const PAN_P95_LIMIT_MS = 8;
const SHARP_AT_LEAST = 0.6;
const TITLE_AT_300 = { left: 20, top: 80, width: 420, height: 100 };
const FIRST = "copy-1";
const ROW_TEXT = "Me gustaría reservar una mesa para cuatro.";
const CASUAL_START = "Hi Marta, can you";

const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-gpu-canvas"));
mkdirSync(shotsAt, { recursive: true });

let failed = 0;
function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) failed += 1;
	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

check(
	"every colour, text size and radius of the kit theme has a GPU class word",
	themeWordsMissing().length === 0,
	themeWordsMissing(),
);

const served = await servedGpuPages();
try {
	await mainThreadRun();
	await workerRun();
	await panRun();
} finally {
	served.close();
}
if (failed > 0) console.log(`${failed} check(s) failed; shots in ${shotsAt}`);
process.exit(failed > 0 ? 1 : 0);

async function mainThreadRun(): Promise<void> {
	const page = await opened("?copies=12", "main");
	try {
		await drawsAndAnswers(page, "main");
		await page.ask(`window.gpuPage.focusFrame(${JSON.stringify(FIRST)}, 3, 40, 80)`);
		await waited(1200);
		const close = await shot(page, "main-300-settled");
		const sharpness = edgeSharpness(close, TITLE_AT_300);
		check(
			"text is sharp at 300% after the zoom settles",
			sharpness >= SHARP_AT_LEAST,
			Math.round(sharpness * 1000) / 1000,
		);
		const pageBefore = commonColourOnRow(close, VIEW[1] - 20, 0, VIEW[0]);
		await page.ask(`document.body.style.setProperty("--background-primary", "#ffd0d0")`);
		await waited(800);
		const pageAfter = commonColourOnRow(await shot(page, "main-tokens-changed"), VIEW[1] - 20, 0, VIEW[0]);
		check("a token changed in the document repaints the GPU frames", pageAfter[0] - pageAfter[1] > 20, {
			pageBefore,
			pageAfter,
		});
	} finally {
		page.close();
	}
}

async function workerRun(): Promise<void> {
	const page = await opened("?worker=1", "worker");
	try {
		await drawsAndAnswers(page, "worker");
	} finally {
		page.close();
	}
}

async function panRun(): Promise<void> {
	const page = await opened("?copies=100&wait=1", "pan");
	try {
		const cold: unknown = await page.ask("window.gpuPage.panBench(300)");
		const warm: unknown = await page.ask("window.gpuPage.panBench(300)");
		const p95 = typeof warm === "object" && warm !== null && "p95Ms" in warm ? Number(warm.p95Ms) : Number.NaN;
		check(`a pan over 100 live copies keeps work p95 under ${PAN_P95_LIMIT_MS} ms`, p95 < PAN_P95_LIMIT_MS, {
			cold,
			warm,
		});
	} finally {
		page.close();
	}
}

async function drawsAndAnswers(page: AskedPage, mode: string): Promise<void> {
	const whole = await shot(page, `${mode}-fit`);
	const light = lightShare(whole);
	check(`${mode}: the frames draw (page-white share, colours)`, light > 0.2 && distinctColours(whole) > 50, {
		light,
		colours: distinctColours(whole),
	});
	await page.ask(`window.gpuPage.focusFrame(${JSON.stringify(FIRST)}, 1, 600, 100)`);
	await waited(500);
	const before = await page.ask(`window.gpuPage.textIn(${JSON.stringify(FIRST)}, "quarterly")`);
	const casual = await pointOf(page, "Casual");
	if (casual) await page.press(casual[0], casual[1]);
	await waited(500);
	const after = await page.ask(`window.gpuPage.textIn(${JSON.stringify(FIRST)}, "quarterly")`);
	const changed = typeof after === "string" && after.startsWith(CASUAL_START) && after !== before;
	check(`${mode}: a real click on Casual changes the translation`, changed, { casual, before, after });
	await page.ask(`window.gpuPage.focusFrame(${JSON.stringify(FIRST)}, 1, 0, 560)`);
	await page.hover(4, 4);
	await waited(500);
	const row = await pointOf(page, ROW_TEXT);
	const y = row?.[1] ?? 0;
	const resting = commonColourOnRow(await shot(page, `${mode}-row-resting`), y, 0, 1100);
	if (row) await page.hover(row[0], row[1]);
	await waited(500);
	const hovered = commonColourOnRow(await shot(page, `${mode}-row-hovered`), y, 0, 1100);
	check(`${mode}: hover changes the row's colour`, row !== null && resting.join() !== hovered.join(), {
		row,
		resting,
		hovered,
	});
	check(
		`${mode}: the page reported no failure`,
		(await page.ask("window.gpuPage.failures.length")) === 0,
		await page.ask("window.gpuPage.failures"),
	);
}

async function opened(query: string, mode: string): Promise<AskedPage> {
	const page = await paged(`${served.origin}${query}`, "gpu canvas", { size: VIEW, onGpu: true });
	for (let tries = 0; tries < 300; tries += 1) {
		if ((await page.ask("window.gpuPage?.ready === true")) === true) break;
		await waited(100);
	}
	check(`${mode}: the GPU canvas started`, (await page.ask("window.gpuPage?.ready === true")) === true, null);
	await waited(800);
	return page;
}

async function pointOf(page: AskedPage, text: string): Promise<readonly [number, number] | null> {
	const point: unknown = await page.ask(`window.gpuPage.locateText(${JSON.stringify(FIRST)}, ${JSON.stringify(text)})`);
	if (typeof point !== "object" || point === null || !("x" in point) || !("y" in point)) return null;
	return [Number(point.x), Number(point.y)];
}

async function shot(page: AskedPage, name: string): Promise<Pixels> {
	const png = await page.shoot();
	writeFileSync(path.join(shotsAt, `${name}.png`), png);
	return pixelsOfPng(png);
}
