import type { CanvasKit } from "canvaskit-wasm";
import type { GpuCanvas } from "./gpu-canvas.js";
import { startGpuEngine } from "./gpu-engine.js";
import type { GpuFont } from "./gpu-engine.js";
import { isToWorker } from "./worker-guards.js";
import type { GpuQuestion, MessageScope, PointerMessage, ToWorker } from "./worker-protocol.js";

export interface GpuWorkerServe {
	readonly loadCanvasKit: () => Promise<CanvasKit>;
	readonly loadFonts: () => Promise<readonly GpuFont[]>;
	readonly started: (gpu: GpuCanvas) => void;
}

export function serveGpuCanvas(scope: MessageScope, serve: GpuWorkerServe): void {
	const waiting: ToWorker[] = [];
	const held: { gpu: GpuCanvas | null } = { gpu: null };
	scope.addEventListener("message", (event) => {
		const message: unknown = event.data;
		if (!isToWorker(message))
			return scope.postMessage({ kind: "failed", reason: "the gpu worker was sent a message it does not know" });
		if (message.kind === "start") return void begin(scope, serve, message, held, waiting);
		if (held.gpu) handle(scope, held.gpu, message);
		else waiting.push(message);
	});
}

async function begin(
	scope: MessageScope,
	serve: GpuWorkerServe,
	start: Extract<ToWorker, { kind: "start" }>,
	held: { gpu: GpuCanvas | null },
	waiting: ToWorker[],
): Promise<void> {
	try {
		const gpu = await startGpuEngine({
			canvas: start.canvas,
			viewport: start.viewport,
			loadCanvasKit: serve.loadCanvasKit,
			fonts: await serve.loadFonts(),
			tokens: start.tokens,
			switches: start.switches,
			setCursor: (cursor) => scope.postMessage({ kind: "cursor", cursor }),
		});
		serve.started(gpu);
		held.gpu = gpu;
		for (const message of waiting.splice(0)) handle(scope, gpu, message);
		scope.postMessage({ kind: "ready" });
	} catch (failure) {
		scope.postMessage({ kind: "failed", reason: failure instanceof Error ? failure.message : String(failure) });
	}
}

function handle(scope: MessageScope, gpu: GpuCanvas, message: ToWorker): void {
	if (message.kind === "pointer") pointTo(gpu, message.pointer);
	if (message.kind === "resize") gpu.resize(message.viewport);
	if (message.kind === "tokens") gpu.setTokens(message.tokens);
	if (message.kind === "ask")
		scope.postMessage({ kind: "answer", id: message.id, value: answerOf(gpu, message.question) });
}

function pointTo(gpu: GpuCanvas, pointer: PointerMessage): void {
	if (pointer.act === "move") gpu.pointer.move(pointer.x, pointer.y);
	if (pointer.act === "down") gpu.pointer.down(pointer.x, pointer.y, pointer.button);
	if (pointer.act === "up") gpu.pointer.up(pointer.x, pointer.y);
	if (pointer.act === "leave") gpu.pointer.leave();
	if (pointer.act === "wheel") gpu.pointer.wheel(pointer.x, pointer.y, pointer.deltaX, pointer.deltaY, pointer.zooms);
}

function answerOf(gpu: GpuCanvas, question: GpuQuestion): unknown {
	if (question.ask === "locateText") return gpu.locateText(question.frame, question.text);
	if (question.ask === "textIn") return gpu.textIn(question.frame, question.includes);
	if (question.ask === "camera") return gpu.camera();
	if (question.ask === "setCamera") gpu.setCamera(question.camera);
	if (question.ask === "fitAll") gpu.fitAll();
	if (question.ask === "focusFrame") gpu.focusFrame(question.frame, question.zoom, question.at);
	return null;
}
