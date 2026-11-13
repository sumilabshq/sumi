import { useLayoutEffect } from "react";
import type { RefObject } from "react";

const DOCK_HEIGHT_PROPERTY = "--wg-studio-ai-dock-height";

export function useWritesDockHeight(dock: RefObject<HTMLDivElement | null>): void {
	useLayoutEffect(() => {
		const node = dock.current;
		const chat = node?.parentElement;

		if (!node || !chat || typeof ResizeObserver !== "function") {
			return undefined;
		}

		const write = (): void => {
			chat.style.setProperty(DOCK_HEIGHT_PROPERTY, `${Math.round(node.getBoundingClientRect().height)}px`);
		};
		write();
		const sizes = new ResizeObserver(write);
		sizes.observe(node);
		return () => sizes.disconnect();
	}, [dock]);
}
