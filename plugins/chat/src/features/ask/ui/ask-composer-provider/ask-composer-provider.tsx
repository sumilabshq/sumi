import { createElement as h } from "react";
import type { ComponentType, ReactElement } from "react";
import { AskComposerContext } from "@sumi/sumi-host-plugin";
import type { WindowOffers, WindowProviderProps } from "@sumi/sumi-host-plugin";
import { AssistantModule } from "@widgetarium/assistant";
import { runtime } from "@widgetarium/data-framework";
import { askComposerOf } from "../../lib/ask-composer-seam.js";

export function askComposerProviderOf(offers: WindowOffers): ComponentType<WindowProviderProps> {
	const composer = askComposerOf({
		windowApp: offers.windowApp,
		focusedChatId: () => offers.focusedChatId(),
		askApp: runtime()
			.imports(AssistantModule({ over: offers.windowServer }))
			.start({
				platform: offers.platform,
				scope: {
					workspaceId: offers.workspaceId,
				},
			}),
	});
	return function AskComposerProvider({ children }: WindowProviderProps): ReactElement {
		return <AskComposerContext.Provider value={composer}>{children}</AskComposerContext.Provider>;
	};
}
