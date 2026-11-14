import { createElement as h } from "react";
import type { ReactElement } from "react";
import { artboards } from "@sumi/artboards/contract";
import { ToggleAction, useTabHeader } from "@sumi/sumi-host-plugin";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { useCanvasView } from "../../lib/canvas-view-context.js";
import { useZoom } from "../../lib/zoom-store.js";
import { BackgroundAction } from "../background-action/background-action.js";

const HIDE_PANEL = {
	label: "Hide pages and layers",
	icon: "panel-right",
};
const SHOW_PANEL = {
	label: "Show pages and layers",
	icon: "panel-right",
};

export function CanvasActions(): ReactElement {
	const { Actions, Tint } = useTabHeader();
	const view = useCanvasView();
	const { tabId } = view;
	const zoom = useZoom(view.zoom);
	const canvas = useQuery(artboards.canvases.getCanvas, { tabId }).data;
	const toggle = useCommand(artboards.view.togglePanel);
	return (
		<Actions>
			<Tint fill={canvas.background} />
			<BackgroundAction />
			<span className="sumi-canvas-zoom" aria-label="Zoom">
				{`${Math.round(zoom * 100)}%`}
			</span>
			<ToggleAction
				isOn={canvas.isPanelOpen}
				whenOn={HIDE_PANEL}
				whenOff={SHOW_PANEL}
				onToggle={() => void toggle.run({ tabId })}
			/>
		</Actions>
	);
}
