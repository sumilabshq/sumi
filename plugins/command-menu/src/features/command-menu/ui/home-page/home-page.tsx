import { createElement as h, useContext } from "react";
import type { ReactElement } from "react";
import { RuntimeProvider } from "@widgetarium/data-framework";
import { PluginSlot } from "@widgetarium/plugin-framework/react";
import type { TabPageProps } from "@sumi/sumi-host-plugin";
import { WindowAppContext } from "../../lib/window-app-context.js";
import { HomePanel } from "./home-panel.js";

const NO_WINDOW_APP = "Home is drawn inside the command menu's window provider, which lends it the window's app";

export function HomePage({ tabId }: TabPageProps): ReactElement {
	const windowApp = useContext(WindowAppContext);

	if (windowApp === null) {
		throw new Error(NO_WINDOW_APP);
	}

	const standard = <HomePanel homeTabId={tabId} head={null} idle={null} placeholder={null} />;
	return (
		<RuntimeProvider runtime={windowApp}>
			<PluginSlot name="command-menu.home" props={{ tabId, children: standard }}>
				{standard}
			</PluginSlot>
		</RuntimeProvider>
	);
}
