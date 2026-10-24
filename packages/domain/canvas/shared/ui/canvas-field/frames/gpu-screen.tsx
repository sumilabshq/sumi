import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { useGpuFrame } from "../../../lib/field/frames/use-gpu-frame.js";
import type { GpuFrameAsk } from "../../../lib/field/frames/use-gpu-frame.js";

export type GpuScreenProps = Omit<GpuFrameAsk, "node">;

const NOT_DRAWN_SAID = "Not drawn · {why}";

export function GpuScreen(asked: GpuScreenProps): ReactElement {
	const node = useRef<HTMLDivElement | null>(null);
	const notDrawn = useGpuFrame({ ...asked, node });
	if (notDrawn === null)
		return <div className="cv:relative" ref={node} style={{ minHeight: asked.minHeight }} data-canvas-gpu-frame="" />;
	return (
		<div
			className="cv:flex cv:items-center cv:justify-center cv:rounded-2xl cv:border-2 cv:border-dashed cv:border-[var(--wg-kit-error-ink)] cv:p-6"
			style={{ minHeight: asked.minHeight }}
			data-canvas-not-drawn={notDrawn}
		>
			<p className="cv:m-0 cv:max-w-[80%] cv:text-center cv:text-lg cv:text-[var(--wg-kit-error-ink)]">
				{NOT_DRAWN_SAID.replace("{why}", notDrawn)}
			</p>
		</div>
	);
}
