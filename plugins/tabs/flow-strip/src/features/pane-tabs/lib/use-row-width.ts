import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";

export function useRowWidth(row: RefObject<HTMLElement | null>): number {
	const [width, setWidth] = useState(0);
	useLayoutEffect(() => {
		const element = row.current;

		if (element === null) {
			return undefined;
		}

		const read = (): void => setWidth(element.getBoundingClientRect().width);
		read();
		const watch = new ResizeObserver(read);
		watch.observe(element);
		return () => watch.disconnect();
	}, [row]);
	return width;
}
