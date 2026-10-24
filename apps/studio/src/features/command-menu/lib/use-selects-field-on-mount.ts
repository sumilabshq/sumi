import { useEffect, useRef } from "react";
import type { RefObject } from "react";

export function useSelectsFieldOnMount(): RefObject<HTMLInputElement | null> {
	const field = useRef<HTMLInputElement>(null);
	useEffect(() => {
		field.current?.focus();
		field.current?.select();
	}, []);
	return field;
}
