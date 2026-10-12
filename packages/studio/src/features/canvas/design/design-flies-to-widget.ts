import { useEffect } from "react";
import type { RefObject } from "react";
import type { PanZoom } from "../stage/pan-zoom.js";
import type { Box } from "../stage/flight.js";
import { COMPONENTS_PAGE } from "./design-canvas-page.js";
import { lookOnto } from "./design-spotlight.js";

export interface WidgetFlight {
	readonly layerRef: RefObject<HTMLDivElement | null>;
	readonly pan: PanZoom;
	readonly page: string;
	readonly widget: string | null;
	readonly onDone: () => void;
}

export function useFliesToWidget({ layerRef, pan, page, widget, onDone }: WidgetFlight): void {
	useEffect(() => {
		if (widget === null || page !== COMPONENTS_PAGE) return undefined;
		const frame = requestAnimationFrame(() => {
			const layer = layerRef.current;
			const group = layer
				? [...layer.querySelectorAll<HTMLElement>("[data-wg-group]")].find((one) => one.dataset["wgGroup"] === widget)
				: null;
			if (layer && group) pan.flyTo(lookOnto(boxInLayer(layer, group), pan.fieldRef.current));
			onDone();
		});
		return () => cancelAnimationFrame(frame);
	}, [layerRef, pan, page, widget, onDone]);
}

function boxInLayer(layer: HTMLElement, element: HTMLElement): Box {
	const origin = layer.getBoundingClientRect();
	const drawn = element.getBoundingClientRect();
	const scale = drawn.width / Math.max(1, element.offsetWidth);
	return {
		x: (drawn.left - origin.left) / scale,
		y: (drawn.top - origin.top) / scale,
		width: element.offsetWidth,
		height: element.offsetHeight,
	};
}
