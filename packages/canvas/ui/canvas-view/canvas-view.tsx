import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { InjectProps } from "@widgetarium/core";
import type { canvasFieldInject } from "../../widgets/canvas-field.widget.js";
import { useSettled } from "./hooks/frames/use-settled.js";
import { CanvasField } from "./canvas-field.js";

export function CanvasFieldView(props: InjectProps<typeof canvasFieldInject>): ReactElement | null {
	const { getDrawing: drawing, getPages: pages } = props;
	const design = useSettled(props.getDesign);
	if (!design || !drawing || !pages) return null;
	return (
		<CanvasField
			key={pages.shown}
			acts={props}
			design={design}
			drawing={drawing}
			pages={pages}
			docs={props.getDocs.items}
		/>
	);
}
