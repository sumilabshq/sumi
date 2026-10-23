import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { AppProvider } from "@widgetarium/core/requests";
import type { StartedApp } from "@widgetarium/core/requests";
import { ShellAppContext } from "../../lib/shell-app-context.js";

export interface ShellAppProviderProps {
	readonly app: StartedApp;
	readonly children: ReactNode;
}

export function ShellAppProvider({ app, children }: ShellAppProviderProps): ReactElement {
	return (
		<ShellAppContext.Provider value={app}>
			<AppProvider app={app}>{children}</AppProvider>
		</ShellAppContext.Provider>
	);
}
