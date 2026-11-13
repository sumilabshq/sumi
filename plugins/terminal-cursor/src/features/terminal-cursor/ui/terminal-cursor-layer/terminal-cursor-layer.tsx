import { createElement as h } from "react";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";
import { useFollowsFocusedCursor } from "../../lib/use-follows-focused-cursor.js";

export function TerminalCursorLayer(): ReactElement | null {
	const spot = useFollowsFocusedCursor();

	if (spot === null) {
		return null;
	}

	return createPortal(
		<span
			key={`${spot.left}:${spot.top}`}
			className="sumi-terminal-cursor"
			aria-hidden="true"
			style={{
				left: spot.left,
				top: spot.top,
				width: spot.width,
				height: spot.height,
				font: spot.font,
				lineHeight: `${spot.height}px`,
				letterSpacing: spot.letterSpacing,
				textTransform: spot.textTransform,
			}}
		>
			{spot.under}
		</span>,
		document.body,
	);
}
