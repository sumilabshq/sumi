import { useEffect } from "react";
import type { RefObject } from "react";

const TALLEST_BOX_PX = 120;

export function useFitsDraft(composerBox: RefObject<HTMLTextAreaElement | null>, draft: string): void {
	useEffect(() => {
		const node = composerBox.current;
		if (!node) return;
		node.style.height = "auto";
		node.style.height = `${Math.min(TALLEST_BOX_PX, node.scrollHeight)}px`;
		node.style.overflowY = node.scrollHeight > TALLEST_BOX_PX ? "auto" : "hidden";
	}, [composerBox, draft]);
}
