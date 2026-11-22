import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { SumiState } from "../../lib/sumi-state.js";
import { CloverMark } from "../clover-mark/clover-mark.js";
import { CloverPlant } from "../clover-plant/clover-plant.js";

export const PLANT_FROM_PX = 64;

export interface SumiFigureProps {
	readonly state: SumiState;
	readonly size: number;
}

export function SumiFigure({ state, size }: SumiFigureProps): ReactElement {
	return (
		<span
			className={`sumi-figure is-${state}`}
			style={{
				width: size,
				height: size,
			}}
			role="img"
			aria-label={`Sumi, ${state}`}
			data-state={state}
		>
			{size < PLANT_FROM_PX ? <CloverMark size={size} /> : <CloverPlant state={state} size={size} />}
		</span>
	);
}
