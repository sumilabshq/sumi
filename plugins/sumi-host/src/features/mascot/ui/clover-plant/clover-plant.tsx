import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { SumiState } from "../../lib/sumi-state.js";
import { usePaintsClover } from "../../lib/use-paints-clover.js";

export interface CloverPlantProps {
	readonly state: SumiState;
	readonly size: number;
}

export function CloverPlant({ state, size }: CloverPlantProps): ReactElement {
	const canvas = usePaintsClover(state, size);
	return (
		<canvas
			ref={canvas}
			className="sumi-figure-plant"
			style={{
				width: size,
				height: size,
			}}
			aria-hidden="true"
		/>
	);
}
