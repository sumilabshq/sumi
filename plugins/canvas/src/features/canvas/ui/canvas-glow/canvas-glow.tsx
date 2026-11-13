import { createElement as h } from "react";
import type { ReactElement } from "react";

interface Placed {
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
}

const GLOW_REACH = 0.6;
const GLOW_REACH_MIN_PX = 480;

export function CanvasGlow({ boards }: { readonly boards: readonly Placed[] }): ReactElement | null {
	if (boards.length === 0) {
		return null;
	}

	const left = Math.min(...boards.map(({ x }) => x));
	const top = Math.min(...boards.map(({ y }) => y));
	const right = Math.max(...boards.map(({ x, w }) => x + w));
	const bottom = Math.max(...boards.map(({ y, h: tall }) => y + tall));
	const reach = Math.max(GLOW_REACH_MIN_PX, GLOW_REACH * Math.max(right - left, bottom - top));
	return (
		<div
			className="sumi-canvas-glow"
			aria-hidden="true"
			style={{
				left: left - reach,
				top: top - reach,
				width: right - left + 2 * reach,
				height: bottom - top + 2 * reach,
			}}
		/>
	);
}
