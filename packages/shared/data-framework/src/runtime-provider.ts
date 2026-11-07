import { QueryClientProvider } from "@tanstack/react-query";
import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { RUNTIME } from "./runtime-context";
import type { Runtime } from "./runtime";

export interface RuntimeProviderProps {
	readonly runtime: Runtime;
	readonly children?: ReactNode;
}

export function RuntimeProvider({ runtime, children }: RuntimeProviderProps): ReactElement {
	return h(RUNTIME.Provider, { value: runtime }, h(QueryClientProvider, { client: runtime.queryClient }, children));
}
