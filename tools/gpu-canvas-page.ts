import { startGpuCanvas, startGpuCanvasInWorker } from "../packages/studio/src/features/canvas/gpu/index.ts";
import type {
	Camera,
	GpuCanvas,
	GpuCanvasRemote,
	CanvasPoint,
	WorkSummary,
} from "../packages/studio/src/features/canvas/gpu/index.ts";
import { addTranslators, loadFixtureCanvasKit, loadFixtureFonts } from "./gpu-canvas-fixture.tsx";

export interface GpuPage {
	readonly mode: "main" | "worker";
	readonly failures: string[];
	ready: boolean;
	locateText(frame: string, text: string): Promise<CanvasPoint | null>;
	textIn(frame: string, includes: string): Promise<string | null>;
	focusFrame(frame: string, zoom: number, x: number, y: number): Promise<unknown>;
	fitAll(): Promise<unknown>;
	panBench(steps: number): Promise<WorkSummary | null>;
}

const PAN_X_PX = 600;
const PAN_Y_PX = 300;

const asked = new URLSearchParams(location.search);
const copies = Number(asked.get("copies") ?? 12);
const canvas = document.getElementById("stage");
const failures: string[] = [];
addEventListener("error", (event) => failures.push(String(event.message)));
addEventListener("unhandledrejection", (event) => failures.push(String(event.reason)));

if (canvas instanceof HTMLCanvasElement) void begin(canvas);
else failures.push("the page has no #stage canvas");

async function begin(stage: HTMLCanvasElement): Promise<void> {
	try {
		const page = asked.get("worker") === "1" ? await workerPage(stage) : await mainPage(stage);
		Object.assign(window, { gpuPage: page });
		page.ready = true;
	} catch (failure) {
		failures.push(failure instanceof Error ? failure.message : String(failure));
	}
}

async function mainPage(stage: HTMLCanvasElement): Promise<GpuPage> {
	const gpu = await startGpuCanvas(stage, {
		loadCanvasKit: loadFixtureCanvasKit,
		fonts: await loadFixtureFonts(),
		switches: { waitForGpu: asked.get("wait") === "1" },
	});
	addTranslators(gpu, copies);
	gpu.fitAll();
	return {
		mode: "main",
		failures,
		ready: false,
		locateText: async (frame, text) => gpu.locateText(frame, text),
		textIn: async (frame, includes) => gpu.textIn(frame, includes),
		focusFrame: async (frame, zoom, x, y) => gpu.focusFrame(frame, zoom, { x, y }),
		fitAll: async () => gpu.fitAll(),
		panBench: (steps) => panned(gpu, steps),
	};
}

async function workerPage(stage: HTMLCanvasElement): Promise<GpuPage> {
	const remote: GpuCanvasRemote = await startGpuCanvasInWorker(stage, new Worker("/gpu-worker.js"), {});
	return {
		mode: "worker",
		failures,
		ready: false,
		locateText: (frame, text) => remote.locateText(frame, text),
		textIn: (frame, includes) => remote.textIn(frame, includes),
		focusFrame: (frame, zoom, x, y) => remote.focusFrame(frame, zoom, { x, y }),
		fitAll: () => remote.fitAll(),
		panBench: async () => null,
	};
}

async function panned(gpu: GpuCanvas, steps: number): Promise<WorkSummary> {
	gpu.fitAll();
	const start: Camera = gpu.camera();
	await nextFrame();
	gpu.stats();
	for (let step = 0; step < steps; step += 1) {
		const phase = (step / steps) * Math.PI * 2;
		gpu.setCamera({ ...start, x: start.x + Math.sin(phase) * PAN_X_PX, y: start.y + (1 - Math.cos(phase)) * PAN_Y_PX });
		await nextFrame();
	}
	await nextFrame();
	return gpu.stats().work;
}

function nextFrame(): Promise<number> {
	return new Promise((drawn) => requestAnimationFrame(drawn));
}
