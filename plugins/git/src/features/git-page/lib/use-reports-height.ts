import { useEffect } from "react";

export function useReportsHeight(element: HTMLElement | null, onHeight: (px: number) => void): void {
	useEffect(() => {
		if (element === null) {
			return undefined;
		}

		const watcher = new ResizeObserver(() => onHeight(element.offsetHeight));
		watcher.observe(element);
		return () => watcher.disconnect();
	}, [element, onHeight]);
}
