import { createElement as h } from "react";
import type { ComponentType, ReactElement } from "react";
import type { WindowOffers, WindowProviderProps } from "@sumi/sumi-host-plugin";
import { WindowAppContext } from "../../lib/window-app-context.js";

export function windowAppProviderOf({ windowApp }: WindowOffers): ComponentType<WindowProviderProps> {
	return function WindowAppProvider({ children }: WindowProviderProps): ReactElement {
		return <WindowAppContext.Provider value={windowApp}>{children}</WindowAppContext.Provider>;
	};
}
