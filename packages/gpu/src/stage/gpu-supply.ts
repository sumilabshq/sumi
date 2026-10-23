import type { CanvasKit } from "canvaskit-wasm";
import type { GpuFont } from "../engine/gpu-engine.js";
import type { GpuCanvas } from "../engine/gpu-canvas.js";
import type { GpuCanvasStart } from "../engine/start-gpu-canvas.js";

export interface GpuSupply {
	readonly startCanvas: (canvas: HTMLCanvasElement, start: GpuCanvasStart) => Promise<GpuCanvas>;
	readonly loadCanvasKit: () => Promise<CanvasKit>;
	readonly loadFonts: () => Promise<readonly GpuFont[]>;
}
