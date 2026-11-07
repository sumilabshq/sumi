import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { sumiAppPageUrlOf } from "@widgetarium/app-registry";
import type { AppPageUrlOf } from "@widgetarium/app-registry";
import type { DrawnTabPage } from "@sumi/sumi-host-plugin";
import { TabPagesContext } from "../../lib/tab-page-context.js";
import { AppPageUrlContext } from "../../lib/app-page-url-context.js";
import type { FrameRoutesFor } from "../../lib/frame-relay.js";
import { FrameRoutesContext } from "../../lib/use-frame-port.js";
import { useOpensAskedLinks } from "../../lib/use-opens-asked-links.js";

export interface AppFramesProviderProps {
	readonly routesFor: FrameRoutesFor;
	readonly pageUrlOf?: AppPageUrlOf;
	readonly tabPages: readonly DrawnTabPage[];
	readonly children: ReactNode;
}

export function AppFramesProvider({
	routesFor,
	pageUrlOf = sumiAppPageUrlOf,
	tabPages,
	children,
}: AppFramesProviderProps): ReactElement {
	useOpensAskedLinks();
	return (
		<AppPageUrlContext.Provider value={pageUrlOf}>
			<TabPagesContext.Provider value={tabPages}>
				<FrameRoutesContext.Provider value={routesFor}>{children}</FrameRoutesContext.Provider>
			</TabPagesContext.Provider>
		</AppPageUrlContext.Provider>
	);
}
