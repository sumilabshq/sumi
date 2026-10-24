import { createElement as h } from "react";
import type { ReactNode } from "react";
import { EmptyState, Skeleton } from "@widgetarium/kit";

const COULD_NOT_LOAD = "Could not load";

export const SLOT_LOADING: ReactNode = h(Skeleton);

export function slotFailed(reason: string): ReactNode {
	return h(EmptyState, { title: COULD_NOT_LOAD, text: reason });
}
