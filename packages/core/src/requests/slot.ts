import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { SLOT_LOADING, slotFailed } from "./boundary-defaults";
import { RequestBoundary } from "./request-boundary";
import type { FailedView } from "./request-boundary";

export interface BoundaryProps {
	readonly loading?: ReactNode;
	readonly error?: FailedView | undefined;
	readonly children?: ReactNode;
}

export function Slot({ loading = SLOT_LOADING, error = slotFailed, children }: BoundaryProps): ReactElement {
	return h(RequestBoundary, { loading, error }, children);
}
