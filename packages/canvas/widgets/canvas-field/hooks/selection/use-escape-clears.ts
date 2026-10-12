import { useEffect } from "react";

export function useEscapeClears(isSet: boolean, clear: () => void): void {
	useEffect(() => {
		if (!isSet) return;
		const onKey = (event: KeyboardEvent): void => {
			if (event.key === "Escape") clear();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [isSet, clear]);
}
