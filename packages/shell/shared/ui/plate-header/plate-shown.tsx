import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { PlateShownContext } from "../../lib/plate-header-context.js";

export interface PlateShownProps {
	readonly isShown: boolean;
	readonly children: ReactNode;
}

export function PlateShown({ isShown, children }: PlateShownProps): ReactElement {
	return <PlateShownContext.Provider value={isShown}>{children}</PlateShownContext.Provider>;
}
