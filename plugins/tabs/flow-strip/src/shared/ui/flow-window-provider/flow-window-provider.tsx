import { createElement as h } from "react";
import type { ComponentType, ReactElement } from "react";
import type { WindowOffers, WindowProviderProps } from "@sumi/sumi-host-plugin";
import { placesWindowOfPage } from "@widgetarium/behaviors";
import { FlowWindowContext } from "../../lib/flow-window-context.js";

export function flowWindowProviderOf(offers: WindowOffers): ComponentType<WindowProviderProps> {
	const window = placesWindowOfPage({
		platform: offers.platform,
		search: location.search,
		workspaceId: offers.workspaceId,
	});
	return function FlowWindowProvider({ children }: WindowProviderProps): ReactElement {
		return <FlowWindowContext.Provider value={window}>{children}</FlowWindowContext.Provider>;
	};
}
