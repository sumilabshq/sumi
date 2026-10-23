import { useLayoutEffect } from "react";
import type { RefObject } from "react";

const CHROME_LEFT_VAR = "--wg-shell-chrome-left";

export function useWritesChromeLeft(frame: RefObject<HTMLDivElement | null>, chromeLeftPx: number): void {
	useLayoutEffect(() => {
		frame.current?.style.setProperty(CHROME_LEFT_VAR, `${chromeLeftPx}px`);
	}, [frame, chromeLeftPx]);
}
