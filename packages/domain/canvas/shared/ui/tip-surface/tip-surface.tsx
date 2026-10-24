import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Tooltip } from "radix-ui";
import { IsUnderTipSurface } from "./is-under-tip-surface.js";

export interface TipSurfaceProps {
	readonly children?: ReactNode;
}

export function TipSurface({ children }: TipSurfaceProps): ReactElement {
	return (
		<IsUnderTipSurface.Provider value={true}>
			<Tooltip.Provider>{children}</Tooltip.Provider>
		</IsUnderTipSurface.Provider>
	);
}
