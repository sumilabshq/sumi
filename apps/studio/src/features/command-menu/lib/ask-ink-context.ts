import { createContext, useContext } from "react";

export type AskInk = (text: string) => void;

export const AskInkContext = createContext<AskInk>(() => undefined);

export function useAskInk(): AskInk {
	return useContext(AskInkContext);
}
