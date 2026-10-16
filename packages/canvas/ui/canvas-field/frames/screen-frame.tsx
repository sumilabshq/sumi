import { createElement as h, useContext } from "react";
import type { ReactElement } from "react";
import { GPU_FRAMES } from "@widgetarium/gpu";
import { useQuery } from "@widgetarium/core/mediator";
import { DrawingQuery } from "../../../requests/drawing.query.js";
import type { Frame } from "../../../schema/regions.schema.js";
import { FrameScreen } from "./frame-screen.js";
import { GpuScreen } from "./gpu-screen.js";

export function ScreenFrame({ frame }: { readonly frame: Frame }): ReactElement {
	const isGpu = useContext(GPU_FRAMES) !== null;
	const { registry } = useQuery(DrawingQuery).data;
	const html = <FrameScreen frame={frame} />;
	return (
		<div
			className="wg-design-frame cv:flex cv:flex-col cv:gap-3 cv:[contain:layout_paint]"
			data-canvas-frame={frame.widget ?? undefined}
			style={{ width: frame.width }}
		>
			<div className="cv:flex cv:min-h-9 cv:items-center cv:justify-between cv:gap-3">
				<span className="wg-design-name cv:text-lg cv:font-semibold cv:text-muted-foreground">{frame.label}</span>
				{frame.situation ? <span className="cv:text-base cv:text-muted-foreground">{frame.situation}</span> : null}
			</div>
			{isGpu ? <GpuScreen frame={frame} registry={registry} fallback={html} /> : html}
		</div>
	);
}
