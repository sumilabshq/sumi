import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { InjectProps } from "@widgetarium/core";
import type { canvasFieldInject } from "../../widgets/canvas-field.widget.js";
import { useSettled } from "./hooks/frames/use-settled.js";
import { CanvasField } from "./canvas-field.js";

export function CanvasFieldView(props: InjectProps<typeof canvasFieldInject>): ReactElement | null {
	const drawing = props.drawingQuery.data;
	const pages = props.pagesQuery.data;
	const design = useSettled(props.designQuery.data);
	if (!design || !drawing || !pages) return null;
	return (
		<CanvasField
			key={pages.shown}
			acts={props}
			design={design}
			drawing={drawing}
			pages={pages}
			docs={props.docsQuery.data.items}
		/>
	);
}
