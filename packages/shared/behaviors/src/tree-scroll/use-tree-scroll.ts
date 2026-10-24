import { useCallback, useEffect } from "react";
import type { RefObject } from "react";
import { TREE_ROW } from "../tree-drag/tree-rows.js";

export interface TreeScrollAsk {
	readonly indent: number;
	readonly picked: string | null;
	readonly isShown: boolean;
}

export interface TreeScroll {
	readonly revealDepth: (depth: number) => void;
}

const UNFOLDED_AFTER_MS = 220;
const PICKED_ROW = `[${TREE_ROW}][data-picked]`;

export function useTreeScroll(
	scroller: RefObject<HTMLElement | null>,
	{ indent, picked, isShown }: TreeScrollAsk,
): TreeScroll {
	useEffect(() => {
		if (!picked || !isShown) return undefined;
		const timer = window.setTimeout(() => {
			const held = scroller.current;
			const row = held?.querySelector<HTMLElement>(PICKED_ROW);
			if (!held || !row) return;
			const top = row.getBoundingClientRect().top - held.getBoundingClientRect().top + held.scrollTop;
			held.scrollTo({
				top: top - held.clientHeight / 2 + row.offsetHeight / 2,
				left: Math.max(0, Number(row.dataset["treeDepth"] ?? 0) - 1) * indent,
				behavior: "smooth",
			});
		}, UNFOLDED_AFTER_MS);
		return () => window.clearTimeout(timer);
	}, [scroller, picked, isShown, indent]);
	const revealDepth = useCallback(
		(depth: number) => scroller.current?.scrollTo({ left: Math.max(0, depth - 1) * indent, behavior: "smooth" }),
		[scroller, indent],
	);
	return { revealDepth };
}
