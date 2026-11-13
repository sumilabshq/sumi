import { useEffect, useState } from "react";
import type { RefObject } from "react";

export function useIsStuckBelow(end: RefObject<HTMLElement | null>): boolean {
	const [isStuck, setStuck] = useState(false);
	useEffect(() => {
		const node = end.current;

		if (!node) {
			return;
		}

		const watcher = new IntersectionObserver(([seen]) => setStuck(seen ? !seen.isIntersecting : false));
		watcher.observe(node);
		return () => watcher.disconnect();
	}, [end]);
	return isStuck;
}
