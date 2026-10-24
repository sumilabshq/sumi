import { useEffect } from "react";
import type { RefObject } from "react";

const FADES_START = "fadesStart";
const FADES_END = "fadesEnd";
const SLACK_PX = 1;
const CURRENT = "[aria-current=true]";

export function useFadesAtEdges(scroller: RefObject<HTMLElement | null>, count: number): void {
	useEffect(() => {
		const held = scroller.current;
		if (held === null) {
			return undefined;
		}

		const stopWatching = watchFades(held);
		held.querySelector<HTMLElement>(CURRENT)?.scrollIntoView({ block: "nearest", inline: "nearest" });
		return stopWatching;
	}, [scroller, count]);
}

function watchFades(held: HTMLElement): () => void {
	const mark = (): void => markFades(held);
	mark();
	const resized = new ResizeObserver(mark);
	resized.observe(held);
	held.addEventListener("scroll", mark, { passive: true });
	return () => {
		resized.disconnect();
		held.removeEventListener("scroll", mark);
	};
}

function markFades(held: HTMLElement): void {
	const hasBefore = held.scrollLeft > SLACK_PX;
	const hasAfter = held.scrollLeft + held.clientWidth < held.scrollWidth - SLACK_PX;
	held.dataset[FADES_START] = String(hasBefore);
	held.dataset[FADES_END] = String(hasAfter);
}
