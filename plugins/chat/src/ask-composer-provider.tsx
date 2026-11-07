import { createElement as h } from "react";
import type { ComponentType, ReactElement } from "react";
import { AskComposerContext } from "@sumi/sumi-host-plugin";
import type { WindowOffers, WindowProviderProps } from "@sumi/sumi-host-plugin";
import { askComposerOf } from "./ask-composer-seam.js";
import { chatAppOf } from "./chat-app.js";
import type { ChatAppAsk } from "./chat-app.js";
import { ChatApps } from "./chat-apps.js";

export function askComposerProviderOf(offers: WindowOffers): ComponentType<WindowProviderProps> {
	const ask: ChatAppAsk = {
		platform: "browser",
		workspaceId: offers.workspaceId,
		host: offers.assistant,
		tasks: offers.core,
	};
	const chatApps = new ChatApps(ask);
	const composer = askComposerOf({
		windowApp: offers.windowApp,
		focusedChatId: () => offers.focusedChatId(),
		askApp: chatAppOf(ask),
		chatAppFor: (chatId) => chatApps.appFor(chatId),
	});
	return function AskComposerProvider({ children }: WindowProviderProps): ReactElement {
		return <AskComposerContext.Provider value={composer}>{children}</AskComposerContext.Provider>;
	};
}
