import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/core/mediator";
import { useMarkedLayers } from "@widgetarium/behaviors";
import { DrawingQuery } from "../../requests/field/drawing.js";
import { KeepSeenLayersCommand } from "../../requests/layers/keep-seen-layers.js";
import type { StatePicture } from "../../schema/design.js";
import { DESKTOP_FRAME } from "../../schema/frame-size.js";
import { LIVE_SCREEN } from "../canvas-field/field-marks.js";
import { DRAWS_AT_ONCE } from "../state-drawing/draw-contexts.js";
import { SCREEN } from "../state-drawing/screen-class.js";
import { StateDrawing } from "../state-drawing/state-drawing.js";

export function LiveScreen({ picture }: { readonly picture: StatePicture }): ReactElement {
	const { registry } = useQuery(DrawingQuery).data;
	const keep = useCommand(KeepSeenLayersCommand);
	const [node, setNode] = useState<HTMLDivElement | null>(null);
	useMarkedLayers(node, (layers) => void keep.run({ key: picture.widget, layers }));
	return (
		<div className={SCREEN} ref={setNode} {...{ [LIVE_SCREEN]: picture.widget }} style={{ width: DESKTOP_FRAME.width }}>
			<DRAWS_AT_ONCE.Provider value={true}>
				<StateDrawing picture={picture} registry={registry} />
			</DRAWS_AT_ONCE.Provider>
		</div>
	);
}
