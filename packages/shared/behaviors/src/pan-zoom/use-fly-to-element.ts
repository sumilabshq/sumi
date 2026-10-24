import { useEffect } from "react";
import type { RefObject } from "react";
import { boxInLayer, lookOnto } from "./look-onto.js";
import type { LookRoom } from "./look-onto.js";
import type { PanZoom } from "./use-pan-zoom.js";

export interface ElementFlight {
	readonly pan: PanZoom;
	readonly layerRef: RefObject<HTMLElement | null>;
	readonly selector: string | null;
	readonly room: LookRoom;
	readonly onDone: () => void;
}

export function useFlyToElement({ pan, layerRef, selector, room, onDone }: ElementFlight): void {
	useEffect(() => {
		if (selector === null) return undefined;
		const frame = requestAnimationFrame(() => {
			const layer = layerRef.current;
			const element = layer?.querySelector<HTMLElement>(selector) ?? null;
			if (layer && element) pan.flyTo(lookOnto(boxInLayer(layer, element), pan.fieldRef.current, room));
			onDone();
		});
		return () => cancelAnimationFrame(frame);
	}, [pan, layerRef, selector, room, onDone]);
}
