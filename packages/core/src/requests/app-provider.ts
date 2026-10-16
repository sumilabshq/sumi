import { QueryClientProvider } from "@tanstack/react-query";
import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { APP } from "./app-context";
import type { StartedApp } from "./app";

export interface AppProviderProps {
	readonly app: StartedApp;
	readonly children?: ReactNode;
}

export function AppProvider({ app, children }: AppProviderProps): ReactElement {
	return h(APP.Provider, { value: app }, h(QueryClientProvider, { client: app.queryClient }, children));
}
