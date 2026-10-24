import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

const STUCK_WITHIN_PX = 32;

export interface StuckScroll {
	readonly scroller: RefObject<HTMLDivElement | null>;
	readonly isStuck: boolean;
	readonly onScroll: () => void;
	readonly toEnd: () => void;
}

export function useStuckToEnd(changed: readonly unknown[]): StuckScroll {
	const scroller = useRef<HTMLDivElement>(null);
	const stuck = useRef(true);
	const [isStuck, setIsStuck] = useState(true);
	const onScroll = useCallback((): void => {
		const node = scroller.current;
		if (!node) return;
		stuck.current = isAtEnd(node);
		setIsStuck(stuck.current);
	}, []);
	const toEnd = useCallback((): void => {
		const node = scroller.current;
		if (!node) return;
		stuck.current = true;
		setIsStuck(true);
		node.scrollTop = node.scrollHeight;
	}, []);
	useEffect(() => {
		const node = scroller.current;
		if (node && stuck.current) node.scrollTop = node.scrollHeight;
	}, changed);
	return { scroller, isStuck, onScroll, toEnd };
}

function isAtEnd(node: HTMLElement): boolean {
	return node.scrollHeight - node.scrollTop - node.clientHeight <= STUCK_WITHIN_PX;
}
