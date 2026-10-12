import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { ShotPartQuery } from "../../requests/shots/shot-part.js";
import { RegionDrawn } from "../canvas-field/region-drawn.js";
import { DRAWS_AT_ONCE } from "../state-drawing/draw-contexts.js";

export interface CanvasShotProps {
	readonly asked: InputOf<typeof ShotPartQuery>;
}

export function CanvasShot({ asked }: CanvasShotProps): ReactElement {
	const { region } = useQuery(ShotPartQuery, asked).data;
	return (
		<DRAWS_AT_ONCE.Provider value={true}>
			<div className="wg-design-field wg-portal">
				<RegionDrawn region={region} />
			</div>
		</DRAWS_AT_ONCE.Provider>
	);
}
