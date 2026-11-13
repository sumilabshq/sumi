import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { artboards } from "@sumi/artboards/contract";
import { useEdgeResize } from "@widgetarium/behaviors";
import { useCommand } from "@widgetarium/data-framework";
import { useCanvasView } from "../../lib/canvas-view-context.js";
import { LayersList } from "../layers-list/layers-list.js";
import { PagesList } from "../pages-list/pages-list.js";

export interface CanvasPanelProps {
	readonly width: number;
}

const DEFAULT_WIDTH = 240;

export function CanvasPanel({ width }: CanvasPanelProps): ReactElement {
	const { tabId } = useCanvasView();
	const resize = useCommand(artboards.view.resizePanel);
	const [held, setHeld] = useState<number | null>(null);
	const keep = (px: number): void => {
		setHeld(null);
		void resize.run({ tabId, width: px });
	};
	const edge = useEdgeResize({
		widthOf: () => held ?? width,
		onResize: setHeld,
		onReset: () => keep(DEFAULT_WIDTH),
	});
	return (
		<aside className="sumi-canvas-panel" style={{ width: held ?? width }} aria-label="Pages and layers">
			<PagesList />
			<LayersList />
			<div
				className="sumi-canvas-panel-edge"
				role="separator"
				aria-orientation="vertical"
				aria-label="Resize pages and layers"
				tabIndex={0}
				{...edge}
				onPointerUp={() => {
					edge.onPointerUp();

					if (held !== null) {
						keep(held);
					}
				}}
			/>
		</aside>
	);
}
