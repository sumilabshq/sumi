import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import type { StatePicture } from "../stage/state-drawing.js";
import type { Size } from "../stage/frame-size.js";
import type { Drawing } from "./design-canvas-shapes.js";
import { useGpuFrame } from "./use-gpu-frame.js";

export interface GpuScreenProps {
	readonly id: string;
	readonly label: string;
	readonly size: Size;
	readonly picture: StatePicture | null;
	readonly registry: Drawing["registry"];
	readonly fallback: ReactElement;
}

const FELL_BACK_SAID = "HTML · {why}";

export function GpuScreen({ fallback, ...frame }: GpuScreenProps): ReactElement {
	const node = useRef<HTMLDivElement | null>(null);
	const { isGpu, failure } = useGpuFrame({ ...frame, node });
	if (isGpu)
		return h("div", { className: "wg-design-gpu-frame", ref: node, style: { minHeight: `${frame.size.height}px` } });
	return h("div", { className: "wg-design-gpu-fallen" }, [
		fallback,
		h(
			"span",
			{ key: "said", className: "wg-design-gpu-said", title: failure },
			FELL_BACK_SAID.replace("{why}", failure ?? ""),
		),
	]);
}
