import { useEffect, useRef } from "react";

export function useEscape(isActive: boolean, onEscape: () => void): void {
	const latest = useRef(onEscape);
	latest.current = onEscape;
	useEffect(() => {
		if (!isActive) return undefined;
		const onKey = (event: KeyboardEvent): void => {
			if (event.key === "Escape") latest.current();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [isActive]);
}
