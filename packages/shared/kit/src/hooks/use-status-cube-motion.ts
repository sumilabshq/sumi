import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { frameStepOf } from "../utils/spring";
import { advanceCube, freshCubeMotion, restingCubeLook } from "../utils/status-cube-tick";
import type { CubeLook } from "../utils/status-cube-tick";

const FIRST_STEP_S = 1 / 60;

export interface StatusCubeParts {
	readonly body: RefObject<SVGPolygonElement | null>;
	readonly eye: RefObject<SVGRectElement | null>;
}

type Mover = (stepS: number) => void;

class SharedFrames {
	private readonly movers = new Set<Mover>();
	private frame = 0;
	private lastAt: number | null = null;

	join(mover: Mover): () => void {
		this.movers.add(mover);

		if (this.frame === 0) {
			this.frame = requestAnimationFrame((now) => this.ticked(now));
		}

		return () => {
			this.movers.delete(mover);
		};
	}

	private ticked(now: number): void {
		const stepS = this.lastAt === null ? FIRST_STEP_S : frameStepOf(now, this.lastAt);
		this.lastAt = now;
		this.movers.forEach((mover) => mover(stepS));

		if (this.movers.size === 0) {
			this.frame = 0;
			this.lastAt = null;
			return;
		}

		this.frame = requestAnimationFrame((next) => this.ticked(next));
	}
}

const SHARED_FRAMES = new SharedFrames();

export function useStatusCubeMotion(isMoving: boolean, size: number): StatusCubeParts {
	const body = useRef<SVGPolygonElement | null>(null);
	const eye = useRef<SVGRectElement | null>(null);

	useEffect(() => {
		if (!isMoving || matchMedia("(prefers-reduced-motion: reduce)").matches) {
			return undefined;
		}

		const motion = freshCubeMotion();
		const leave = SHARED_FRAMES.join((stepS) => drawn({ body, eye }, advanceCube(motion, stepS, size)));
		return () => {
			leave();
			drawn({ body, eye }, restingCubeLook(size));
		};
	}, [isMoving, size]);
	return {
		body,
		eye,
	};
}

function drawn(parts: StatusCubeParts, look: CubeLook): void {
	parts.body.current?.setAttribute("points", look.body);
	parts.eye.current?.setAttribute("transform", look.eye);
}
