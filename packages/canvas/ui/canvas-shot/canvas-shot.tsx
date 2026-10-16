import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/requests";
import type { InputOf } from "@widgetarium/core/requests";
import { ShotPartQuery } from "../../features/shots/contract.js";
import { RegionDrawn } from "../canvas-field/region-drawn.js";
import { DRAWS_AT_ONCE } from "../../lib/state-drawing/draw-contexts.js";

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
