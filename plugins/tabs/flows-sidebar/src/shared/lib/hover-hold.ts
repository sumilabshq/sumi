import { useEffect, useRef, useState } from "react";

export function useHoverHold(isDragging: boolean): boolean {
	const [isSettling, setIsSettling] = useState(false);
	const wasDragging = useRef(false);

	useEffect(() => {
		if (isDragging) {
			wasDragging.current = true;
			return undefined;
		}

		if (!wasDragging.current) {
			return undefined;
		}

		wasDragging.current = false;
		setIsSettling(true);
		const release = (): void => setIsSettling(false);
		document.addEventListener("pointermove", release, { once: true, capture: true });
		return () => document.removeEventListener("pointermove", release, { capture: true });
	}, [isDragging]);

	return isDragging || isSettling;
}
