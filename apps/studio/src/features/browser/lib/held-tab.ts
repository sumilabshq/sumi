import { createContext, useContext } from "react";

export const HeldTabContext = createContext<string | null>(null);

export function useHeldTab(): string | null {
	return useContext(HeldTabContext);
}
