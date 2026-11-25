import { createElement as h, useLayoutEffect, useRef } from "react";
import type { ReactElement } from "react";
import type { DropLine } from "../../../../shared/lib/drop-line.js";

export interface DropLineMarkProps {
	readonly line: DropLine | null;
}

export function DropLineMark({ line }: DropLineMarkProps): ReactElement | null {
	const mark = useRef<HTMLDivElement>(null);
	useLayoutEffect(() => {
		const element = mark.current;
		const frame = element?.offsetParent;

		if (element === null || element === undefined || line === null || !(frame instanceof HTMLElement)) {
			return;
		}

		const box = frame.getBoundingClientRect();
		element.style.setProperty("--drop-y", `${line.y - box.top + frame.scrollTop}px`);
		element.style.setProperty("--drop-x", `${line.glyphX - box.left + frame.scrollLeft}px`);
		element.style.setProperty("--drop-width", `${line.right - line.glyphX}px`);
	}, [line]);

	if (line === null) {
		return null;
	}

	return <div ref={mark} className="sumi-flows-drop-line" aria-hidden="true" />;
}
