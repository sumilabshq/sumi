import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { useMarkedLayers } from "@widgetarium/behaviors";
import { DrawingQuery } from "../../../features/field/contract.js";
import { KeepSeenLayersCommand } from "../../../features/layers/contract.js";
import type { StatePicture } from "../../schema/design.schema.js";
import { DESKTOP_FRAME } from "../../schema/frame-size.schema.js";
import { LIVE_SCREEN } from "../../lib/field/field-marks.js";
import { SCREEN } from "../../lib/state-drawing/screen-class.js";
import { StateDrawing } from "../state-drawing/state-drawing.js";

export function LiveScreen({ picture }: { readonly picture: StatePicture }): ReactElement {
	const { registry } = useQuery(DrawingQuery).data;
	const keep = useCommand(KeepSeenLayersCommand);
	const [node, setNode] = useState<HTMLDivElement | null>(null);
	useMarkedLayers(node, (layers) => void keep.run({ key: picture.widget, layers }));
	return (
		<div className={SCREEN} ref={setNode} {...{ [LIVE_SCREEN]: picture.widget }} style={{ width: DESKTOP_FRAME.width }}>
			<StateDrawing picture={picture} registry={registry} />
		</div>
	);
}
