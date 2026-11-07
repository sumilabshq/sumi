import { createElement as h, Fragment } from "react";
import type { ComponentType, ReactElement, ReactNode } from "react";
import type { WindowProviderProps } from "@sumi/sumi-host-plugin";

export interface WindowProvidersProps {
	readonly providers: readonly ComponentType<WindowProviderProps>[];
	readonly children: ReactNode;
}

export function WindowProviders({ providers, children }: WindowProvidersProps): ReactElement {
	const [Outer, ...inner] = providers;

	if (Outer === undefined) {
		return <Fragment>{children}</Fragment>;
	}

	return (
		<Outer>
			<WindowProviders providers={inner}>{children}</WindowProviders>
		</Outer>
	);
}
