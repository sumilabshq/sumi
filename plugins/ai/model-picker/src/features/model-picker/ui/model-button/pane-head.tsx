import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";

export interface PaneHeadProps {
	readonly title: string;
	readonly action?: ReactNode;
}

export function PaneHead({ title, action = null }: PaneHeadProps): ReactElement {
	return (
		<div className="sumi-pane-head">
			<span>{title}</span>
			{action}
		</div>
	);
}
