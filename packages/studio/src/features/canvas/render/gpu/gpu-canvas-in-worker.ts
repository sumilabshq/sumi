import type { Camera } from "./camera.js";
import type { GpuSwitches } from "./canvas-view.js";
import type { CanvasPoint } from "./gpu-canvas.js";
import { forwardInput, viewportOf } from "./page-input.js";
import { tokensOfDocument, watchTokens } from "./tokens-from-document.js";
import { isCamera, isFromWorker, isCanvasPoint } from "./worker-guards.js";
import type { PointerSink } from "./view-pointer.js";
import type { GpuQuestion, PointerMessage, ToWorker } from "./worker-protocol.js";

export interface GpuWorkerStart {
	readonly switches?: Partial<GpuSwitches> | undefined;
	readonly tokensFrom?: Element | undefined;
}

export interface GpuCanvasRemote {
	locateText(frame: string, text: string): Promise<CanvasPoint | null>;
	textIn(frame: string, includes: string): Promise<string | null>;
	camera(): Promise<Camera | null>;
	setCamera(camera: Camera): Promise<unknown>;
	fitAll(): Promise<unknown>;
	focusFrame(frame: string, zoom: number, at: CanvasPoint): Promise<unknown>;
	stop(): void;
}

export function startGpuCanvasInWorker(
	canvas: HTMLCanvasElement,
	worker: Worker,
	start: GpuWorkerStart,
): Promise<GpuCanvasRemote> {
	const tokensFrom = start.tokensFrom ?? canvas.parentElement ?? canvas;
	const answers = new Map<number, (value: unknown) => void>();
	const tickets = { next: 1 };
	const send = (message: ToWorker, transfer: Transferable[] = []): void => worker.postMessage(message, transfer);
	const ask = (question: GpuQuestion): Promise<unknown> =>
		new Promise((answered) => {
			const id = tickets.next++;
			answers.set(id, answered);
			send({ kind: "ask", id, question });
		});
	const offscreen = canvas.transferControlToOffscreen();
	send(
		{
			kind: "start",
			canvas: offscreen,
			viewport: viewportOf(canvas),
			tokens: tokensOfDocument(tokensFrom),
			switches: start.switches ?? {},
		},
		[offscreen],
	);
	const point = (pointer: PointerMessage): void => send({ kind: "pointer", pointer });
	const stopInput = forwardInput(canvas, pointerSinkOf(point), (viewport) => send({ kind: "resize", viewport }));
	const stopTokens = watchTokens(tokensFrom, (tokens) => send({ kind: "tokens", tokens }));
	const remote: GpuCanvasRemote = {
		locateText: async (frame, text) => pointOrNull(await ask({ ask: "locateText", frame, text })),
		textIn: async (frame, includes) => stringOrNull(await ask({ ask: "textIn", frame, includes })),
		camera: async () => cameraOrNull(await ask({ ask: "camera" })),
		setCamera: (camera) => ask({ ask: "setCamera", camera }),
		fitAll: () => ask({ ask: "fitAll" }),
		focusFrame: (frame, zoom, at) => ask({ ask: "focusFrame", frame, zoom, at }),
		stop: () => {
			stopInput();
			stopTokens();
			worker.terminate();
		},
	};
	return new Promise((ready, refused) => {
		worker.addEventListener("message", (event: MessageEvent) => {
			const message: unknown = event.data;
			if (!isFromWorker(message)) return;
			if (message.kind === "ready") ready(remote);
			if (message.kind === "failed") refused(new Error(`gpu canvas worker: ${message.reason}`));
			if (message.kind === "cursor") canvas.style.cursor = message.cursor;
			if (message.kind !== "answer") return;
			answers.get(message.id)?.(message.value);
			answers.delete(message.id);
		});
	});
}

function pointerSinkOf(point: (pointer: PointerMessage) => void): PointerSink {
	return {
		move: (x, y) => point({ act: "move", x, y }),
		down: (x, y, button) => point({ act: "down", x, y, button }),
		up: (x, y) => point({ act: "up", x, y }),
		leave: () => point({ act: "leave" }),
		wheel: (x, y, deltaX, deltaY, zooms) => point({ act: "wheel", x, y, deltaX, deltaY, zooms }),
	};
}

function pointOrNull(value: unknown): CanvasPoint | null {
	return isCanvasPoint(value) ? value : null;
}

function stringOrNull(value: unknown): string | null {
	return typeof value === "string" ? value : null;
}

function cameraOrNull(value: unknown): Camera | null {
	return isCamera(value) ? value : null;
}
