import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button } from "@widgetarium/kit";
import type { PanZoom } from "./hooks/camera/use-pan-zoom.js";

const ZOOM_STEP = 0.1;
export const FLOATING =
	"cv:absolute cv:flex cv:items-center cv:rounded-xl cv:bg-page cv:px-2.5 cv:py-1.5 cv:text-base cv:shadow-[0_0_0_1px_var(--wg-kit-card-edge)]";

export function ZoomBar({ pan }: { readonly pan: PanZoom }): ReactElement {
	return (
		<div className={`${FLOATING} cv:bottom-4 cv:left-4 cv:z-[2] cv:gap-0.5`} data-canvas-chrome="" data-canvas-zoom="">
			<Button size="s" variant="ghost" onClick={pan.refit}>
				Fit
			</Button>
			<Button size="s" variant="ghost" onClick={() => pan.zoomTo(1)}>
				1:1
			</Button>
			<Button size="s" variant="ghost" onClick={() => pan.zoomBy(-ZOOM_STEP)}>
				−
			</Button>
			<Button size="s" variant="ghost" onClick={() => pan.zoomBy(ZOOM_STEP)}>
				+
			</Button>
			<span className="cv:text-muted-foreground" ref={pan.percentRef} />
		</div>
	);
}
