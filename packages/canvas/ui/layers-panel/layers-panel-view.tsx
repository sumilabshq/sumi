import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { InjectProps } from "@widgetarium/core";
import type { layersPanelInject } from "../../widgets/layers-panel.widget.js";
import { LayersPanel } from "./layers-panel.js";

export function LayersPanelView(props: InjectProps<typeof layersPanelInject>): ReactElement | null {
	const { selectCommand, moveLayerCommand } = props;
	const drawing = props.drawingQuery.data;
	const screen = props.designQuery.data?.screens.find((one) => one.name === props.pagesQuery.data?.shownScreen);
	if (!screen || !drawing) return null;
	return (
		<LayersPanel
			screen={screen}
			isOpen={props.isLayersOpenQuery.data}
			keepsLiveCopy={props.modeQuery.data === "pointer"}
			registry={drawing.registry}
			picked={props.selectionQuery.data?.mark ?? null}
			onPick={(widget, mark) => void selectCommand.run({ selection: mark ? { widget, mark, spot: null } : null })}
			onDrop={(dropped) => void moveLayerCommand.run(dropped)}
		/>
	);
}
