import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";

export interface StateActionsProps {
	readonly children: ReactNode;
}

const ACTIONS =
	"cv:mt-6 cv:flex cv:flex-wrap cv:items-center cv:justify-center cv:gap-2 cv:@max-[600px]/page:mt-[18px]";

export function StateActions({ children }: StateActionsProps): ReactElement {
	return <div className={ACTIONS}>{children}</div>;
}
