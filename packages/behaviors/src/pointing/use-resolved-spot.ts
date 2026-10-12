import { useEffect } from "react";
import type { RefObject } from "react";
import { hitOfMark } from "../marked-layers/hits.js";
import { lookOnto } from "../pan-zoom/look-onto.js";
import type { LookRoom } from "../pan-zoom/look-onto.js";
import type { PanZoom } from "../pan-zoom/use-pan-zoom.js";
import { firstScreenOf, hitRootOf, screenBoxOf, spotOn } from "./spotlight.js";
import type { PointingMarks, Spot } from "./pointing-marks.js";

export interface SpotAsked {
	readonly widget: string;
	readonly mark: string;
}

export interface SpotResolving {
	readonly pan: PanZoom;
	readonly marks: PointingMarks;
	readonly room: LookRoom;
	readonly asked: SpotAsked | null;
	readonly onResolved: (spot: Spot) => void;
}

export function useResolvedSpot(layerRef: RefObject<HTMLElement | null>, resolving: SpotResolving): void {
	const { pan, marks, room, asked, onResolved } = resolving;
	useEffect(() => {
		if (!asked) return;
		const layer = layerRef.current;
		const screen = firstScreenOf(layer, asked.widget, marks);
		const root = layer && screen ? hitRootOf(layer, screen, asked.widget, marks) : null;
		const hit = root ? hitOfMark(root, asked.mark) : null;
		if (!layer || !screen || !hit) return;
		const spot = spotOn(screenBoxOf(layer, screen, pan.lookNow().scale), hit);
		onResolved(spot);
		pan.flyTo(lookOnto(spot.target, pan.fieldRef.current, room));
	}, [layerRef, pan, marks, room, asked, onResolved]);
}
