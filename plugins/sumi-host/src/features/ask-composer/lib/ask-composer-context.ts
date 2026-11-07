import { createContext, useContext } from "react";
import type { ComponentType } from "react";
import type { Runtime } from "@widgetarium/data-framework";
import { NoComposerBar } from "./no-composer-bar.js";

export interface AskComposer {
	readonly app: Runtime | null;
	readonly bar: ComponentType;
	ask(text: string, sends: boolean, chatId: string | null): void;
}

export const NO_ASK_COMPOSER: AskComposer = {
	app: null,
	bar: NoComposerBar,
	ask: () => undefined,
};

export const AskComposerContext = createContext<AskComposer>(NO_ASK_COMPOSER);

export function useAskComposer(): AskComposer {
	return useContext(AskComposerContext);
}
