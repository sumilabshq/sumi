import { createElement as h } from "react";
import type { ReactElement } from "react";
import { stillGoalOf, lidOf } from "../../lib/sumi-goals.js";
import { BODY_PAD_OF_SIZE, EYE_OF_SIZE, bodyPointsOf, eyeTransformOf, restingCorners } from "../../lib/sumi-springs.js";
import type { SumiState } from "../../lib/sumi-state.js";
import { useSumiMotion } from "../../lib/use-sumi-motion.js";

export interface SumiFigureProps {
	readonly state: SumiState;
	readonly size: number;
}

export function SumiFigure({ state, size }: SumiFigureProps): ReactElement {
	const parts = useSumiMotion(state, size);
	const pad = size * BODY_PAD_OF_SIZE;
	const half = size / 2;
	const eye = size * EYE_OF_SIZE;
	const still = stillGoalOf(state);
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
			<svg
				className="sumi-figure-art"
				viewBox={`${-half - pad} ${-half - pad} ${size + 2 * pad} ${size + 2 * pad}`}
				style={{
					width: size + 2 * pad,
					height: size + 2 * pad,
					margin: -pad,
				}}
				aria-hidden="true"
			>
				<polygon ref={parts.body} className="sumi-figure-body" points={bodyPointsOf(restingCorners(), size)} />
				<rect
					ref={parts.eye}
					className="sumi-figure-eye"
					x={-eye / 2}
					y={-eye / 2}
					width={eye}
					height={eye}
					transform={eyeTransformOf({ ...still, vx: 0, vy: 0 }, size, lidOf(state, 0))}
				/>
			</svg>
		</span>
	);
}
