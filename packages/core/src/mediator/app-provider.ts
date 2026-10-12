import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { APP } from "./app-context";
import type { App } from "./sends";

export interface AppProviderProps {
	readonly app: App;
	readonly children?: ReactNode;
}

export function AppProvider({ app, children }: AppProviderProps): ReactElement {
	return h(APP.Provider, { value: app }, children);
}
