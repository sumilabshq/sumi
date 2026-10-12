import { useEffect, useState } from "react";

const SEEN_AHEAD = "50%";
const FIELD = "[data-canvas-field]";

export function useIsSeen(node: HTMLElement | null): boolean {
	const [isSeen, setSeen] = useState(false);
	useEffect(() => {
		if (!node || isSeen) return;
		const watcher = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) setSeen(true);
			},
			{ root: node.closest(FIELD), rootMargin: SEEN_AHEAD },
		);
		watcher.observe(node);
		return () => watcher.disconnect();
	}, [node, isSeen]);
	return isSeen;
}
