import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { useWindowLayers } from "../../lib/window-layers-context.js";

export function WindowLayers(): ReactElement {
	return (
		<>
			{useWindowLayers().map(({ id, layer: Layer }) => (
				<Layer key={id} />
			))}
		</>
	);
}
