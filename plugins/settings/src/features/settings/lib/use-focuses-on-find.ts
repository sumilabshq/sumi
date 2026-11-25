import { useEffect } from "react";
import type { RefObject } from "react";

export function useFocusesOnFind(
	shown: RefObject<HTMLElement | null>,
	field: RefObject<HTMLInputElement | null>,
): void {
	useEffect(() => {
		const focusField = (event: KeyboardEvent): void => {
			if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "f") {
				return;
			}

			if (shown.current?.checkVisibility() !== true) {
				return;
			}

			event.preventDefault();
			field.current?.focus();
			field.current?.select();
		};
		window.addEventListener("keydown", focusField);
		return () => window.removeEventListener("keydown", focusField);
	}, [shown, field]);
}
