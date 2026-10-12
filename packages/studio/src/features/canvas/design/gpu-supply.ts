import { createContext } from "react";
import type { CanvasKit } from "canvaskit-wasm";
import type { GpuFont } from "../gpu/index.js";

export interface GpuSupply {
	readonly loadCanvasKit: () => Promise<CanvasKit>;
	readonly loadFonts: () => Promise<readonly GpuFont[]>;
}

export const GPU_SUPPLY = createContext<GpuSupply | null>(null);
