import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";

export interface TaskPropProps {
	readonly name: string;
	readonly children: ReactNode;
}

export function TaskProp({ name, children }: TaskPropProps): ReactElement {
	return (
		<div className="wg-tasks-prop">
			<span>{name}</span>
			<span className="wg-tasks-prop-value">{children}</span>
		</div>
	);
}
