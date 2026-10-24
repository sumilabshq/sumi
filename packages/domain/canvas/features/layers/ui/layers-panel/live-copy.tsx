import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { LayersPanelQuery } from "../../contract.js";
import { LiveScreen } from "../../../../shared/ui/layers-panel/live-screen.js";

export function LiveCopy(): ReactElement | null {
	const { liveCopy } = useQuery(LayersPanelQuery).data;
	if (!liveCopy) return null;
	return (
		<div
			className="cv:pointer-events-none cv:fixed cv:top-0 cv:left-[-100000px] cv:[contain:layout_paint]"
			aria-hidden
			data-canvas-live-copy=""
		>
			<LiveScreen picture={liveCopy} />
		</div>
	);
}
