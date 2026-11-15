import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { artboards } from "@sumi/artboards/contract";
import { useEdgeResize } from "@widgetarium/behaviors";
import { useCommand } from "@widgetarium/data-framework";
import { SidePanel } from "@widgetarium/kit";
import { useCanvasView } from "../../lib/canvas-view-context.js";
import { LayersList } from "../layers-list/layers-list.js";
import { PagesList } from "../pages-list/pages-list.js";

export interface CanvasPanelProps {
	readonly width: number;
}

const DEFAULT_WIDTH = 240;

export function CanvasPanel({ width }: CanvasPanelProps): ReactElement {
	const { canvasId } = useCanvasView();
	const resize = useCommand(artboards.view.resizePanel);
	const [held, setHeld] = useState<number | null>(null);
	const keep = (px: number): void => {
		setHeld(null);
		void resize.run({ canvasId, width: px });
	};
	const edge = useEdgeResize({
		widthOf: () => held ?? width,
		edge: "start",
		onResize: setHeld,
		onReset: () => keep(DEFAULT_WIDTH),
	});
	return (
		<SidePanel
			side="end"
			width={held ?? width}
			label="Pages and layers"
			edgeLabel="Resize pages and layers"
			edge={{
				...edge,
				onPointerUp: () => {
					edge.onPointerUp();

					if (held !== null) {
						keep(held);
					}
				},
			}}
		>
			<PagesList />
			<LayersList />
		</SidePanel>
	);
}
