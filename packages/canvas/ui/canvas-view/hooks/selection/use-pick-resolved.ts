import { useEffect } from "react";
import type { RefObject } from "react";
import type { Selection } from "../../../../schemas/selection.schema.js";
import { hitOfMark } from "../../../layers/hits.js";
import { firstScreenOf, hitRootOf, lookOnto, screenBoxOf, spotOn } from "../../lib/spotlight.js";
import type { PanZoom } from "../camera/use-pan-zoom.js";
import type { Picking } from "./use-canvas-selection.js";

export function usePickResolved(
	layerRef: RefObject<HTMLDivElement | null>,
	pan: PanZoom,
	{ picked, select }: Picking,
): void {
	useEffect(() => {
		if (!picked || picked.spot !== null) return;
		const layer = layerRef.current;
		const screen = firstScreenOf(layer, picked.widget);
		const root = layer && screen ? hitRootOf(layer, screen, picked.widget) : null;
		const hit = root ? hitOfMark(root, picked.mark) : null;
		if (!layer || !screen || !hit) return;
		const spot = spotOn(screenBoxOf(layer, screen, pan.lookNow().scale), hit);
		const resolved: Selection = { ...picked, spot };
		void select({ selection: resolved });
		pan.flyTo(lookOnto(spot.target, pan.fieldRef.current));
	}, [layerRef, pan, picked, select]);
}
