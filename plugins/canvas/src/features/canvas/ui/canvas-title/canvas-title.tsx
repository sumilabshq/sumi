import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { artboards } from "@sumi/artboards/contract";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { tooltipMarks } from "@widgetarium/kit";
import { useRecordsTabTitle } from "../../../../shared/lib/use-records-tab-title.js";
import { useCanvasView } from "../../lib/canvas-view-context.js";
import { NameField } from "../name-field/name-field.js";

const SAID = "Rename canvas";

export function CanvasTitle(): ReactElement {
	const { tabId, canvasId } = useCanvasView();
	const { title } = useQuery(artboards.canvases.getCanvas, { canvasId }).data;
	const rename = useCommand(artboards.canvases.renameCanvas);
	const [isNaming, setNaming] = useState(false);
	useRecordsTabTitle(tabId, title);

	if (isNaming) {
		return (
			<NameField
				name={title}
				className="sumi-canvas-title-field"
				onDone={(name) => {
					setNaming(false);

					if (name !== null) {
						void rename.run({
							canvasId,
							title: name,
						});
					}
				}}
			/>
		);
	}

	return (
		<button
			type="button"
			className="sumi-canvas-top-button is-title"
			{...tooltipMarks({ said: SAID })}
			onClick={() => setNaming(true)}
		>
			<span>{title}</span>
		</button>
	);
}
