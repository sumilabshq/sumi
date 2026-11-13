import { useEffect } from "react";
import type { RefObject } from "react";

const TALLEST_BOX_PX = 120;

export function useFitsDraft(composerBox: RefObject<HTMLTextAreaElement | null>, draft: string): () => void {
	useEffect(() => {
		const node = composerBox.current;

		if (!node) {
			return;
		}

		fitDraft(node);
	}, [composerBox, draft]);

	useEffect(() => {
		const node = composerBox.current;

		if (!node || typeof ResizeObserver !== "function") {
			return undefined;
		}

		let frame = 0;
		const sizes = new ResizeObserver(() => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => fitDraft(node));
		});
		sizes.observe(node);
		return () => {
			cancelAnimationFrame(frame);
			sizes.disconnect();
		};
	}, [composerBox]);
	return () => {
		if (composerBox.current) {
			fitDraft(composerBox.current);
		}
	};
}

function fitDraft(node: HTMLTextAreaElement): void {
	node.style.height = "auto";
	node.style.height = `${Math.min(TALLEST_BOX_PX, node.scrollHeight)}px`;
	node.style.overflowY = node.scrollHeight > TALLEST_BOX_PX ? "auto" : "hidden";
}
