import { createElement as h, useId } from "react";
import type { ReactElement, ReactNode } from "react";

export interface StudioRailProps {
	readonly children: ReactNode;
}

const RAIL_LABEL = "Workspaces";

export function StudioRail({ children }: StudioRailProps): ReactElement {
	const labelId = useId();
	return h("nav", { className: "wg-studio-rail", "aria-labelledby": labelId }, [
		h("span", { key: "label", id: labelId, className: "wg-studio-rail-label" }, RAIL_LABEL),
		h("div", { key: "board" }, children),
	]);
}
