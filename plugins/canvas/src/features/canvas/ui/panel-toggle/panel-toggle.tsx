import { createElement as h } from "react";
import type { ReactElement } from "react";
import { artboards } from "@sumi/artboards/contract";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { Icon, tooltipMarks } from "@widgetarium/kit";
import { useCanvasView } from "../../lib/canvas-view-context.js";

const ICON_PX = 16;
const HIDE_PANEL = "Hide pages and layers";
const SHOW_PANEL = "Show pages and layers";

export function PanelToggle(): ReactElement {
	const { canvasId } = useCanvasView();
	const { isPanelOpen } = useQuery(artboards.canvases.getCanvas, { canvasId }).data;
	const toggle = useCommand(artboards.view.togglePanel);
	const label = isPanelOpen ? HIDE_PANEL : SHOW_PANEL;
	return (
		<button
			type="button"
			className="sumi-canvas-top-button is-square"
			aria-label={label}
			aria-pressed={isPanelOpen}
			{...tooltipMarks({ said: label })}
			onClick={() => void toggle.run({ canvasId })}
		>
			<Icon name="panel-right" size={ICON_PX} />
		</button>
	);
}
