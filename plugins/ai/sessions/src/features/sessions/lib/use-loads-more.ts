import { useCallback, useRef } from "react";
import type { RefCallback } from "react";

export function useLoadsMore(loadMore: () => void): RefCallback<HTMLDivElement> {
	const latestLoad = useRef(loadMore);
	latestLoad.current = loadMore;
	return useCallback((node: HTMLDivElement | null) => {
		if (node === null) {
			return undefined;
		}

		const watcher = new IntersectionObserver((entries) => {
			if (entries.some(({ isIntersecting }) => isIntersecting)) {
				latestLoad.current();
			}
		});
		watcher.observe(node);
		return () => watcher.disconnect();
	}, []);
}
