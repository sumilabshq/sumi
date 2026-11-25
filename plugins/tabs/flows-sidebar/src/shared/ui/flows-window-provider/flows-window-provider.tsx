import { createElement as h } from "react";
import type { ComponentType, ReactElement } from "react";
import type { WindowOffers, WindowProviderProps } from "@sumi/sumi-host-plugin";
import { placesWindowOfPage } from "@widgetarium/behaviors";
import { FlowsWindowContext } from "../../lib/flows-window.js";

export function flowsWindowProviderOf(offers: WindowOffers): ComponentType<WindowProviderProps> {
	const window = placesWindowOfPage({
		platform: offers.platform,
		search: location.search,
		workspaceId: offers.workspaceId,
	});
	return function FlowsWindowProvider({ children }: WindowProviderProps): ReactElement {
		return <FlowsWindowContext.Provider value={window}>{children}</FlowsWindowContext.Provider>;
	};
}
