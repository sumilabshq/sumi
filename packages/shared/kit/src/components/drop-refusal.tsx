import { createElement as h, useLayoutEffect, useRef } from "react";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";
import { portalLayer } from "../utils/portal-layer";

export interface DropRefusalProps {
	readonly anchor: HTMLElement | null;
	readonly words: string;
}

export function DropRefusal({ anchor, words }: DropRefusalProps): ReactElement | null {
	const veil = useRef<HTMLDivElement | null>(null);
	useLayoutEffect(() => {
		let frame = 0;
		const follow = (): void => {
			const box = anchor?.getBoundingClientRect();

			if (box !== undefined && veil.current !== null) {
				Object.assign(veil.current.style, {
					left: `${box.left}px`,
					top: `${box.top}px`,
					width: `${box.width}px`,
					height: `${box.height}px`,
				});
			}

			frame = requestAnimationFrame(follow);
		};
		follow();
		return () => cancelAnimationFrame(frame);
	}, [anchor]);

	if (anchor === null) {
		return null;
	}

	return createPortal(
		<div ref={veil} role="status" className="wg-kit-drop-refusal">
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="9" />
				<path d="m5.6 5.6 12.8 12.8" />
			</svg>
			<span>{words}</span>
		</div>,
		portalLayer(),
	);
}
