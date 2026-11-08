import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/data-framework";
import { canvas } from "@widgetarium/canvas";
import { RegionDrawn } from "./region-drawn.js";

export function FieldRegions(): ReactElement {
	const { regions } = useQuery(canvas.field.fieldRegions).data;
	return (
		<>
			{regions.map((region) => (
				<RegionDrawn key={region.kind} region={region} />
			))}
		</>
	);
}
