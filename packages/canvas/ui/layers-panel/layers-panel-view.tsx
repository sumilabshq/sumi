import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { InjectProps } from "@widgetarium/core";
import type { layersPanelInject } from "../../widgets/layers-panel.widget.js";
import { LayersPanel } from "./layers-panel.js";

export function LayersPanelView(props: InjectProps<typeof layersPanelInject>): ReactElement | null {
	const { getDesign, getDrawing, getPages, getSelection, select, moveLayer } = props;
	const screen = getDesign?.screens.find((one) => one.name === getPages?.shownScreen);
	if (!screen || !getDrawing) return null;
	return (
		<LayersPanel
			screen={screen}
			isOpen={props.getIsLayersOpen}
			keepsLiveCopy={props.getMode === "pointer"}
			registry={getDrawing.registry}
			picked={getSelection?.mark ?? null}
			onPick={(widget, mark) => void select({ selection: mark ? { widget, mark, spot: null } : null })}
			onDrop={(dropped) => void moveLayer(dropped)}
		/>
	);
}
