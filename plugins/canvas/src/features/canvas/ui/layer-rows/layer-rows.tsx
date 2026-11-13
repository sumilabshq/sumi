import { createElement as h, useMemo } from "react";
import type { ReactElement } from "react";
import { layersOf } from "../../../../shared/lib/layers-of.js";
import { LayerRow } from "../layer-row/layer-row.js";

export interface LayerRowsProps {
	readonly html: string;
}

export function LayerRows({ html }: LayerRowsProps): ReactElement {
	const layers = useMemo(() => layersOf(html), [html]);
	return (
		<div role="group">
			{layers.map((layer) => (
				<LayerRow key={layer.path} layer={layer} depth={1} />
			))}
		</div>
	);
}
