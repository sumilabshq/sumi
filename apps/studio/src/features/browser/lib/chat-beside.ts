import { createContext, useContext } from "react";
import type { StartedApp } from "@widgetarium/core/requests";

export const ChatBesideContext = createContext<StartedApp | null>(null);

export function useChatBeside(): StartedApp | null {
	return useContext(ChatBesideContext);
}
