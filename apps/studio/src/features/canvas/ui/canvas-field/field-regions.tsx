import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { FieldRegionsQuery } from "@widgetarium/canvas";
import { RegionDrawn } from "./region-drawn.js";

export function FieldRegions(): ReactElement {
	const { regions } = useQuery(FieldRegionsQuery).data;
	return (
		<>
			{regions.map((region) => (
				<RegionDrawn key={region.kind} region={region} />
			))}
		</>
	);
}
