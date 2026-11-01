import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { sumiAppPageUrlOf } from "@widgetarium/app-registry";
import type { AppPageUrlOf } from "@widgetarium/app-registry";
import { AppPageUrlContext } from "../../lib/app-page-url-context.js";
import type { FrameRoutesFor } from "../../lib/frame-relay.js";
import { FrameRoutesContext } from "../../lib/use-frame-port.js";
import { useOpensAskedLinks } from "../../lib/use-opens-asked-links.js";

export interface AppFramesProviderProps {
	readonly routesFor: FrameRoutesFor;
	readonly pageUrlOf?: AppPageUrlOf;
	readonly children: ReactNode;
}

export function AppFramesProvider({
	routesFor,
	pageUrlOf = sumiAppPageUrlOf,
	children,
}: AppFramesProviderProps): ReactElement {
	useOpensAskedLinks();
	return (
		<AppPageUrlContext.Provider value={pageUrlOf}>
			<FrameRoutesContext.Provider value={routesFor}>{children}</FrameRoutesContext.Provider>
		</AppPageUrlContext.Provider>
	);
}
