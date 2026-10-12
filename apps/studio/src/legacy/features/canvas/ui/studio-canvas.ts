import { createElement as h, useCallback, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import type { DesignPort } from "../contract.js";
import type { StudioState } from "@widgetarium/core/engine/studio-state-port.js";
import type { Size } from "../local/frame-size.js";
import { innerSizeOf, useWatchesSize } from "../local/layer-fit.js";
import { DESIGN_OPENED_ON, DesignStage } from "./design-stage.js";
import type { TopBarCorners } from "./design-top-bar.js";
import type { GpuSupply } from "../render/gpu-supply.js";

export interface StudioDesign {
	readonly port: DesignPort;
	readonly app: string;
	readonly gpu?: GpuSupply | undefined;
}

export interface StudioCanvasProps {
	readonly design: StudioDesign;
	readonly state: StudioState;
	readonly corners: TopBarCorners;
}

const FIELD = ".wg-design-field";

export function StudioCanvas({ design, state, corners }: StudioCanvasProps): ReactElement {
	const viewRef = useRef<HTMLDivElement | null>(null);
	const mountRef = useRef<HTMLDivElement | null>(null);
	const [size, setSize] = useState<Size | null>(null);
	const [view, setView] = useState(DESIGN_OPENED_ON);
	useWatchesSize(viewRef, setSize, innerSizeOf);
	const port = useMemo(() => ({ ...design.port, returnToView: async () => state.show("app") }), [design.port, state]);
	const fieldOf = useCallback(() => mountRef.current?.querySelector<HTMLElement>(FIELD) ?? null, []);
	const stage = size
		? h(DesignStage, { port, app: design.app, view, onView: setView, size, fieldOf, corners, gpu: design.gpu })
		: null;
	return h(
		"div",
		{ ref: viewRef, className: "wg-design-view" },
		h("div", { ref: mountRef, className: "wg-mount wg-design-mount wg-portal" }, stage),
	);
}
