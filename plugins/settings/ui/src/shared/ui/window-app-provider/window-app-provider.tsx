import { createElement as h } from "react";
import type { ComponentType } from "react";
import type { WindowOffers, WindowProviderProps } from "@sumi/sumi-host-plugin";
import { WindowAppContext } from "../../lib/window-app-context.js";

export function windowAppProviderOf({ windowApp }: WindowOffers): ComponentType<WindowProviderProps> {
	return function SettingsWindowApp({ children }: WindowProviderProps) {
		return <WindowAppContext.Provider value={windowApp}>{children}</WindowAppContext.Provider>;
	};
}
