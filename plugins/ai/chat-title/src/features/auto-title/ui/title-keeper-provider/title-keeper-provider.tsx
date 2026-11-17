import { createElement as h } from "react";
import type { ComponentType, ReactElement } from "react";
import type { WindowOffers, WindowProviderProps } from "@sumi/sumi-host-plugin";
import { TitleKeeperContext, titleKeeperOf } from "../../../../shared/lib/title-keeper.js";

export function titleKeeperProviderOf(offers: WindowOffers): ComponentType<WindowProviderProps> {
	const keeper = titleKeeperOf(offers.windowApp);
	return function TitleKeeperProvider({ children }: WindowProviderProps): ReactElement {
		return <TitleKeeperContext.Provider value={keeper}>{children}</TitleKeeperContext.Provider>;
	};
}
