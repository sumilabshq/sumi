import { createElement as h, useMemo, useState } from "react";
import type { ReactElement } from "react";
import type { TabPageProps } from "@sumi/sumi-host-plugin";
import { artboards } from "@sumi/artboards/contract";
import { useQuery } from "@widgetarium/data-framework";
import { CanvasViewStateContext } from "../../lib/canvas-view-context.js";
import { ZoomStore } from "../../lib/zoom-store.js";
import { ArtboardField } from "../artboard-field/artboard-field.js";
import { CanvasActions } from "../canvas-actions/canvas-actions.js";
import { CanvasPanel } from "../canvas-panel/canvas-panel.js";

export function CanvasPage({ tabId }: TabPageProps): ReactElement {
	const [pickedBoardId, pickBoard] = useState<string | null>(null);
	const [zoom] = useState(() => new ZoomStore());
	const canvas = useQuery(artboards.canvases.getCanvas, { tabId }).data;
	const view = useMemo(
		() => ({
			tabId,
			pickedBoardId,
			zoom,
			pickBoard,
		}),
		[tabId, pickedBoardId, zoom],
	);
	return (
		<CanvasViewStateContext.Provider value={view}>
			<CanvasActions />
			<div className="sumi-canvas" data-canvas-tab={tabId}>
				{canvas.isPanelOpen ? (
					<CanvasPanel width={canvas.panelWidth} />
				) : null}
				<ArtboardField key={canvas.shownPage} />
			</div>
		</CanvasViewStateContext.Provider>
	);
}
