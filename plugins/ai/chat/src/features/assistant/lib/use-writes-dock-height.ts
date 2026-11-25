import { useLayoutEffect } from "react";
import type { RefObject } from "react";

const DOCK_HEIGHT_PROPERTY = "--studio-ai-dock-height";

export function useWritesDockHeight(dock: RefObject<HTMLDivElement | null>): void {
	useLayoutEffect(() => {
		const node = dock.current;
		const chat = node?.parentElement;

		if (!node || !chat || typeof ResizeObserver !== "function") {
			return undefined;
		}

		let isWaitingForRest = false;
		const write = (): void => {
			const moving = finiteAnimationsIn(node);

			if (moving.length === 0) {
				chat.style.setProperty(DOCK_HEIGHT_PROPERTY, `${Math.round(node.getBoundingClientRect().height)}px`);
				return;
			}

			if (isWaitingForRest) {
				return;
			}

			isWaitingForRest = true;
			void Promise.allSettled(moving.map((running) => running.finished)).then(() => {
				isWaitingForRest = false;
				write();
			});
		};
		write();
		const sizes = new ResizeObserver(write);
		sizes.observe(node);
		return () => sizes.disconnect();
	}, [dock]);
}

function finiteAnimationsIn(node: HTMLElement): Animation[] {
	return node
		.getAnimations({ subtree: true })
		.filter((running) => Number.isFinite(running.effect?.getComputedTiming().endTime ?? Infinity));
}
