import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { useMarkedLayers } from "@widgetarium/behaviors";
import { useDrawing } from "../../lib/drawing.js";
import { KeepSeenLayersCommand } from "@widgetarium/canvas";
import type { StatePicture } from "@widgetarium/canvas";
import { LIVE_SCREEN } from "../../lib/field-marks.js";
import { SCREEN } from "../../lib/screen-class.js";
import { StateDrawing } from "../state-drawing/state-drawing.js";

export interface LiveScreenProps {
	readonly picture: StatePicture;
	readonly widthPx: number;
}

export function LiveScreen({ picture, widthPx }: LiveScreenProps): ReactElement {
	const { registry } = useDrawing();
	const keep = useCommand(KeepSeenLayersCommand);
	const [node, setNode] = useState<HTMLDivElement | null>(null);
	useMarkedLayers(node, (layers) => void keep.run({ key: picture.widget, layers }));
	return (
		<div className={SCREEN} ref={setNode} {...{ [LIVE_SCREEN]: picture.widget }} style={{ width: widthPx }}>
			<StateDrawing picture={picture} registry={registry} />
		</div>
	);
}
