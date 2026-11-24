import { createElement as h } from "react";
import type { ComponentType, ReactElement } from "react";
import type { WindowOffers, WindowProviderProps } from "@sumi/sumi-host-plugin";
import { placesWindowHere } from "@widgetarium/behaviors";
import { FlowWindowContext } from "../../lib/flow-window-context.js";

export function flowWindowProviderOf(offers: WindowOffers): ComponentType<WindowProviderProps> {
	const window = placesWindowHere(offers.platform === "tauri" ? location.search : null, offers.workspaceId);
	return function FlowWindowProvider({ children }: WindowProviderProps): ReactElement {
		return <FlowWindowContext.Provider value={window}>{children}</FlowWindowContext.Provider>;
	};
}
