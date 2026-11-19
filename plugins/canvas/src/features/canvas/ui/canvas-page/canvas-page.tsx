import { createElement as h, useMemo, useState } from "react";
import type { ReactElement } from "react";
import type { TabPageProps } from "@sumi/sumi-host-plugin";
import { artboards } from "@sumi/artboards/contract";
import { useQuery } from "@widgetarium/data-framework";
import { CanvasHome } from "../../../canvas-home/ui/canvas-home/canvas-home.js";
import { CanvasViewStateContext } from "../../lib/canvas-view-context.js";
import { useCanvasPlace } from "../../lib/use-canvas-place.js";
import { ZoomStore } from "../../lib/zoom-store.js";
import { ArtboardField } from "../artboard-field/artboard-field.js";
import { CanvasPanel } from "../canvas-panel/canvas-panel.js";
import { CanvasTopRow } from "../canvas-top-row/canvas-top-row.js";

interface CanvasOfProps {
	readonly tabId: string;
	readonly canvasId: string;
}

export function CanvasPage({ tabId }: TabPageProps): ReactElement | null {
	const place = useCanvasPlace(tabId);

	if (place.kind === "waiting") {
		return null;
	}

	if (place.kind === "home") {
		return <CanvasHome tabId={tabId} />;
	}

	return <CanvasOf key={place.canvasId} tabId={tabId} canvasId={place.canvasId} />;
}

function CanvasOf({ tabId, canvasId }: CanvasOfProps): ReactElement {
	const [pickedBoardId, pickBoard] = useState<string | null>(null);
	const [zoom] = useState(() => new ZoomStore());
	const canvas = useQuery(artboards.canvases.getCanvas, { canvasId }).data;
	const view = useMemo(
		() => ({
			tabId,
			canvasId,
			pickedBoardId,
			zoom,
			pickBoard,
		}),
		[tabId, canvasId, pickedBoardId, zoom],
	);
	return (
		<CanvasViewStateContext.Provider value={view}>
			<div className="sumi-canvas" data-canvas-id={canvasId} data-sumi-corner="float">
				<CanvasTopRow />
				{canvas.isPanelOpen ? <CanvasPanel width={canvas.panelWidth} /> : null}
				<ArtboardField key={canvas.shownPage} />
			</div>
		</CanvasViewStateContext.Provider>
	);
}
