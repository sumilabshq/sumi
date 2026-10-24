import { createContext, useContext } from "react";
import type { GpuSupply } from "@widgetarium/gpu";

export type ReturnTo =
	| { readonly kind: "view"; readonly open: () => Promise<void> }
	| { readonly kind: "note"; readonly cameFrom: string; readonly open: (note: string) => Promise<void> };

export interface CanvasSurroundings {
	readonly gpu: GpuSupply | null;
	readonly ownsPaste: () => boolean;
	readonly returnTo: ReturnTo;
}

const DETACHED_CANVAS: CanvasSurroundings = {
	gpu: null,
	ownsPaste: () => false,
	returnTo: {
		kind: "view",
		open: async () => undefined,
	},
};

export const CanvasSurroundingsContext = createContext<CanvasSurroundings>(DETACHED_CANVAS);

export function useCanvasSurroundings(): CanvasSurroundings {
	return useContext(CanvasSurroundingsContext);
}
