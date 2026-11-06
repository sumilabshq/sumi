import { createContext, useContext } from "react";
import type { StartedApp } from "@widgetarium/framework";

export interface AskComposer {
	readonly app: StartedApp | null;
	ask(text: string, sends: boolean, chatId: string | null): void;
}

export const NO_ASK_COMPOSER: AskComposer = {
	app: null,
	ask: () => undefined,
};

export const AskComposerContext = createContext<AskComposer>(NO_ASK_COMPOSER);

export function useAskComposer(): AskComposer {
	return useContext(AskComposerContext);
}
