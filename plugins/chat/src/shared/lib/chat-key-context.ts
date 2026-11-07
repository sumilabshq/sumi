import { createContext, useContext } from "react";

export const ChatKeyContext = createContext<string | null>(null);

export function useChatKey(): string | null {
	return useContext(ChatKeyContext);
}
