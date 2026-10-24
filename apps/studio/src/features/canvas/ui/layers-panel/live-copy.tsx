import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { LayersPanelQuery } from "@widgetarium/canvas";
import { LiveScreen } from "./live-screen.js";

export function LiveCopy(): ReactElement | null {
	const { liveCopy, liveWidthPx } = useQuery(LayersPanelQuery).data;
	if (!liveCopy) return null;
	return (
		<div
			className="cv:pointer-events-none cv:fixed cv:top-0 cv:left-[-100000px] cv:[contain:layout_paint]"
			aria-hidden
			data-canvas-live-copy=""
		>
			<LiveScreen picture={liveCopy} widthPx={liveWidthPx} />
		</div>
	);
}
