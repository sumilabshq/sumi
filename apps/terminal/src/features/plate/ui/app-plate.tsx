import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";

export interface AppPlateProps {
	readonly name: string;
	readonly children: ReactNode;
}

export function AppPlate({ name, children }: AppPlateProps): ReactElement {
	return (
		<main className="wg-app-plate" aria-label={name}>
			<div className="wg-app-plate-body">{children}</div>
		</main>
	);
}
