import { useEffect } from "react";
import type { RefObject } from "react";

export function useSelectsOnMount(field: RefObject<HTMLInputElement | null>): void {
	useEffect(() => field.current?.select(), [field]);
}
