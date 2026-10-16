import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/mediator";
import { FieldRegionsQuery } from "../../requests/field-regions.query.js";
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
