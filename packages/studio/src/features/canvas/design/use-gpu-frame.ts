import { createElement as h, useContext, useEffect, useLayoutEffect, useMemo } from "react";
import type { ReactNode, RefObject } from "react";
import { DRAWS_INLINE } from "@widgetarium/core/draws-inline.js";
import { StateDrawing } from "../stage/state-drawing.js";
import type { StatePicture } from "../stage/state-drawing.js";
import { REPORTS_DRAW_FAILURE } from "../stage/use-reports-failure.js";
import type { Size } from "../stage/frame-size.js";
import type { Drawing } from "./design-canvas-shapes.js";
import { GPU_PAGES, useGpuFailure } from "./gpu-pages.js";
import type { GpuPages } from "./gpu-pages.js";

export interface GpuFrameAsk {
	readonly id: string;
	readonly label: string;
	readonly size: Size;
	readonly picture: StatePicture | null;
	readonly registry: Drawing["registry"];
	readonly node: RefObject<HTMLDivElement | null>;
}

export interface GpuFrameDrawn {
	readonly isGpu: boolean;
	readonly failure: string | undefined;
}

// TODO: draw a board on the GPU; WidgetSurface still needs a DOM node
const BOARDS_STAY_HTML = "a board is drawn as HTML; the GPU canvas draws widget states only";

export function useGpuFrame({ id, label, size, picture, registry, node }: GpuFrameAsk): GpuFrameDrawn {
	const pages = useContext(GPU_PAGES);
	const failure = useGpuFailure(pages, id);
	const element = useMemo(
		() => (picture ? frameTreeOf(pages, id, picture, registry) : null),
		[pages, id, picture, registry],
	);
	const isGpu = pages !== null && element !== null && failure === undefined;
	useEffect(() => {
		if (pages && !picture) pages.fail(id, BOARDS_STAY_HTML);
	}, [pages, picture, id]);
	useLayoutEffect(() => {
		const held = node.current;
		if (!isGpu || !held) return undefined;
		return pages.claim({ id, title: label, width: size.width, minHeight: size.height, node: held }, element);
	}, [isGpu, pages, id, label, size.width, size.height, node]);
	useEffect(() => {
		if (isGpu) pages.redraw(id, element);
	}, [isGpu, pages, id, element]);
	return { isGpu, failure };
}

function frameTreeOf(
	pages: GpuPages | null,
	id: string,
	picture: StatePicture,
	registry: Drawing["registry"],
): ReactNode {
	const report = (failure: unknown): void => pages?.fail(id, failure);
	return h(
		DRAWS_INLINE.Provider,
		{ value: true },
		h(REPORTS_DRAW_FAILURE.Provider, { value: report }, h(StateDrawing, { picture, registry })),
	);
}
