import { createContext, useContext } from "react";
import type { RefObject } from "react";

export interface Expanding {
	readonly isExpanded: boolean;
	readonly frame: RefObject<HTMLDivElement | null>;
	setExpanded(isExpanded: boolean): void;
}

export const ExpandingContext = createContext<Expanding | null>(null);

export function useExpanding(): Expanding | null {
	return useContext(ExpandingContext);
}
