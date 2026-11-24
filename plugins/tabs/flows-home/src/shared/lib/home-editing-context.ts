import { createContext, useContext } from "react";

export const HomeEditingContext = createContext(false);

export function useIsHomeEditing(): boolean {
	return useContext(HomeEditingContext);
}
