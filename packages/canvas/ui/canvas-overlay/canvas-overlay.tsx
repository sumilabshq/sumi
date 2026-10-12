import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { InjectProps } from "@widgetarium/core";
import type { canvasOverlayInject } from "../../widgets/canvas-overlay.widget.js";
import { Placed } from "./placed.js";

export function CanvasOverlay(props: InjectProps<typeof canvasOverlayInject>): ReactElement | null {
	const { getViewport: viewport, field: Field } = props;
	if (!viewport) return null;
	return (
		<div
			className="cv:relative cv:overflow-hidden cv:bg-page"
			style={{ width: viewport.width, height: viewport.height }}
			data-canvas-view=""
		>
			<Field />
			<Placed items={props.start} at="cv:inset-y-0 cv:left-0 cv:z-[1]" />
			<Placed items={props.end} at="cv:inset-y-0 cv:right-0 cv:z-[1]" />
			<Placed items={props.bottom} at="cv:bottom-4 cv:left-1/2 cv:z-[2] cv:-translate-x-1/2" />
			<Placed items={props.header} at="cv:inset-x-0 cv:top-0 cv:z-[2]" />
		</div>
	);
}
