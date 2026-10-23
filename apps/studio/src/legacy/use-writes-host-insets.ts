import { useEffect, useLayoutEffect, useState } from "react";
import type { RefObject } from "react";
import type { StudioHostPort } from "@widgetarium/core/engine/studio-host.js";

const INSET_LEFT = "--wg-studio-inset-left";
const INSET_RIGHT = "--wg-studio-inset-right";
const INSET_TOP = "--wg-studio-inset-top";

export function useWritesHostInsets(frame: RefObject<HTMLDivElement | null>, studio: StudioHostPort): void {
	const [{ left, right, top }, setInsets] = useState(() => studio.insets());
	useEffect(() => studio.onInsets(() => setInsets(studio.insets())), [studio]);
	useLayoutEffect(() => {
		const style = frame.current?.style;
		if (!style) return;
		style.setProperty(INSET_LEFT, `${left}px`);
		style.setProperty(INSET_RIGHT, `${right}px`);
		style.setProperty(INSET_TOP, `${top}px`);
	}, [frame, left, right, top]);
}
