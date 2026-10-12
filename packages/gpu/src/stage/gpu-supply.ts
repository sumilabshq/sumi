import type { CanvasKit } from "canvaskit-wasm";
import type { GpuFont } from "../engine/gpu-engine.js";

export interface GpuSupply {
	readonly loadCanvasKit: () => Promise<CanvasKit>;
	readonly loadFonts: () => Promise<readonly GpuFont[]>;
}
