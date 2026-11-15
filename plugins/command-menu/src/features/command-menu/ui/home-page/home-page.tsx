import { createElement as h, useContext } from "react";
import type { ReactElement } from "react";
import { RuntimeProvider } from "@widgetarium/data-framework";
import type { TabPageProps } from "@sumi/sumi-host-plugin";
import { WindowAppContext } from "../../lib/window-app-context.js";
import { HomePanel } from "./home-panel.js";

const NO_WINDOW_APP = "Home is drawn inside the command menu's window provider, which lends it the window's app";

export function HomePage({ tabId }: TabPageProps): ReactElement {
	const windowApp = useContext(WindowAppContext);

	if (windowApp === null) {
		throw new Error(NO_WINDOW_APP);
	}

	return (
		<RuntimeProvider runtime={windowApp}>
			<HomePanel homeTabId={tabId} />
		</RuntimeProvider>
	);
}
