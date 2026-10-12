import { createElement as h, useRef, useState } from "react";
import type { ReactElement } from "react";

export interface Placed {
	readonly left: number;
	readonly top: number;
}

const WINDOW_EDGE_PX = 8;

export function TipBubble({ label, placed }: { readonly label: string; readonly placed: Placed }): ReactElement {
	const bubble = useRef<HTMLDivElement | null>(null);
	const [left, setLeft] = useState(placed.left);
	const onNode = (node: HTMLDivElement | null): void => {
		if (!node || bubble.current === node) return;
		bubble.current = node;
		const half = node.offsetWidth / 2;
		setLeft(Math.min(window.innerWidth - WINDOW_EDGE_PX - half, Math.max(WINDOW_EDGE_PX + half, placed.left)));
	};
	return (
		<div
			className="wg-portal cv:pointer-events-none cv:fixed cv:z-[var(--layer-tooltip)] cv:w-max cv:max-w-80 cv:-translate-x-1/2 cv:rounded-lg cv:bg-ink cv:px-2.5 cv:py-1.5 cv:text-sm cv:leading-[1.35] cv:font-medium cv:text-page cv:motion-safe:animate-canvas-tip-in"
			ref={onNode}
			style={{ left, top: placed.top }}
		>
			{label}
		</div>
	);
}
