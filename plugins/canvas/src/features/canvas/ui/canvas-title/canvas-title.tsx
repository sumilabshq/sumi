import { createElement as h } from "react";
import type { ReactElement } from "react";
import { artboards } from "@sumi/artboards/contract";
import { useQuery } from "@widgetarium/data-framework";
import { useRecordsTabTitle } from "../../../../shared/lib/use-records-tab-title.js";
import { useCanvasView } from "../../lib/canvas-view-context.js";

export function CanvasTitle(): ReactElement {
	const { tabId, canvasId } = useCanvasView();
	const { title } = useQuery(artboards.canvases.getCanvas, { canvasId }).data;
	useRecordsTabTitle(tabId, title);

	return (
		<span className="sumi-canvas-title">
			<span>{title}</span>
		</span>
	);
}
