import { useEffect } from "react";
import type { RefObject } from "react";

const FIELD_OR_PICKER = ".sumi-flows-field, .sumi-flows-picker";

export function useRefocusesAfterPicking(isPicking: boolean, nameRef: RefObject<HTMLInputElement | null>): void {
	useEffect(() => {
		const focused = document.activeElement;
		const isFocusLeaving = focused === null || focused === document.body || focused.closest(FIELD_OR_PICKER) !== null;
		if (!isPicking && isFocusLeaving) {
			nameRef.current?.focus();
		}
	}, [isPicking, nameRef]);
}
