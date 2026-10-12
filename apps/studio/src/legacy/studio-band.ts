import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
export interface TopBarCorners {
	readonly start: ReactNode;
	readonly end: ReactNode;
}

export function StudioBand({ corners }: { readonly corners: TopBarCorners }): ReactElement {
	return h("header", { className: "wg-studio-band" }, corners.start, corners.end);
}
