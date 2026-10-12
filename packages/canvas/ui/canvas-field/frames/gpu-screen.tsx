import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import type { StatePicture } from "../../../schema/design.js";
import type { Drawing } from "../../../schema/drawing.js";
import type { FrameSize } from "../../../schema/frame-size.js";
import { useGpuFrame } from "./use-gpu-frame.js";

export interface GpuScreenProps {
	readonly id: string;
	readonly label: string;
	readonly size: FrameSize;
	readonly picture: StatePicture | null;
	readonly registry: Drawing["registry"];
	readonly fallback: ReactElement;
}

const FELL_BACK_SAID = "HTML · {why}";

export function GpuScreen({ fallback, ...frame }: GpuScreenProps): ReactElement {
	const node = useRef<HTMLDivElement | null>(null);
	const { isGpu, failure } = useGpuFrame({ ...frame, node });
	if (isGpu)
		return <div className="cv:relative" ref={node} style={{ minHeight: frame.size.height }} data-canvas-gpu-frame="" />;
	return (
		<div className="cv:relative" data-canvas-gpu-fallen="">
			{fallback}
			<span
				className="cv:absolute cv:top-2 cv:right-2 cv:z-[1] cv:max-w-[60%] cv:truncate cv:rounded-pill cv:bg-warning-wash cv:px-2 cv:py-0.5 cv:text-xs cv:text-ink"
				title={failure}
				data-canvas-gpu-said=""
			>
				{FELL_BACK_SAID.replace("{why}", failure ?? "")}
			</span>
		</div>
	);
}
