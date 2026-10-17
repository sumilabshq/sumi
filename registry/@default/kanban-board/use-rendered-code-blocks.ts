import { useEffect, useRef, useState } from "react";
import type { RenderMarkdown } from "./types";

export function useRenderedCodeBlocks(markdown: string, render: RenderMarkdown | undefined) {
	const holder = useRef<HTMLDivElement | null>(null);
	const [blocks, setBlocks] = useState<HTMLElement[]>([]);

	useEffect(() => {
		const element = holder.current;
		if (!element || !render) return undefined;
		const stop = render(element, markdown);
		const collect = () => setBlocks((held) => blocksToKeep(held, [...element.querySelectorAll("pre")]));

		collect();
		const watcher = new MutationObserver(collect);
		watcher.observe(element, { childList: true, subtree: true });

		return () => {
			watcher.disconnect();
			setBlocks([]);
			stop?.();
		};
	}, [markdown]);

	return { holder, blocks };
}

function blocksToKeep(held: HTMLElement[], found: HTMLElement[]): HTMLElement[] {
	const isSame = held.length === found.length && held.every((block, at) => block === found[at]);
	return isSame ? held : found;
}
