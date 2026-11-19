import { createElement as h } from "react";
import type { ComponentType, ReactElement } from "react";
import type { WindowOffers, WindowProviderProps } from "@sumi/sumi-host-plugin";
import { TitleKeeperContext, titleKeeperOf } from "../../lib/title-keeper.js";
import { WindowAppContext } from "../../lib/window-app-context.js";

export function chatTitleProviderOf(offers: WindowOffers): ComponentType<WindowProviderProps> {
	const keeper = titleKeeperOf(offers.windowApp);
	return function ChatTitleProvider({ children }: WindowProviderProps): ReactElement {
		return (
			<WindowAppContext.Provider value={offers.windowApp}>
				<TitleKeeperContext.Provider value={keeper}>{children}</TitleKeeperContext.Provider>
			</WindowAppContext.Provider>
		);
	};
}
