import { createElement as h } from "react";
import type { ReactElement } from "react";
import { STATUS_CUBE_SAID } from "../constants/status-cube";
import type { StatusCubeState } from "../constants/status-cube";
import { useStatusCubeMotion } from "../hooks/use-status-cube-motion";
import { cn } from "../utils/cn";
import { cubeGeometryOf, restingCubeLook } from "../utils/status-cube-tick";

export interface StatusCubeProps {
	readonly state: StatusCubeState;
	readonly size: number;
	readonly className?: string | undefined;
}

export function StatusCube({ state, size, className }: StatusCubeProps): ReactElement {
	const parts = useStatusCubeMotion(state === "working", size);
	const geometry = cubeGeometryOf(size);
	const resting = restingCubeLook(size);
	return (
		<span
			data-slot="status-cube"
			className={cn("wg-kit-status-cube", `is-${state}`, className)}
			style={{
				width: size,
				height: size,
			}}
			role="img"
			aria-label={STATUS_CUBE_SAID[state]}
			data-state={state}
		>
			<svg className="wg-kit-status-cube-art" viewBox={geometry.viewBox} aria-hidden="true">
				<polygon
					ref={parts.body}
					className="wg-kit-status-cube-body"
					points={resting.body}
					strokeWidth={geometry.edge}
				/>
				<rect
					ref={parts.eye}
					className="wg-kit-status-cube-eye"
					x={-geometry.eyeSide / 2}
					y={-geometry.eyeSide / 2}
					width={geometry.eyeSide}
					height={geometry.eyeSide}
					transform={resting.eye}
				/>
			</svg>
		</span>
	);
}
