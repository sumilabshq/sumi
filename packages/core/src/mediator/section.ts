import { createElement as h } from "react";
import type { ReactElement } from "react";
import { SECTION_LOADING, sectionFailed } from "./boundary-defaults";
import { RequestBoundary } from "./request-boundary";
import type { BoundaryProps } from "./slot";

export function Section({ loading = SECTION_LOADING, error = sectionFailed, children }: BoundaryProps): ReactElement {
	return h(RequestBoundary, { loading, error }, children);
}
