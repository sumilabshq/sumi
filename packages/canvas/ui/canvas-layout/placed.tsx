import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Slot } from "@widgetarium/core/mediator";

export function Placed({ at, children }: { readonly at: string; readonly children?: ReactNode }): ReactElement | null {
	if (children === undefined || children === null) return null;
	return (
		<div className={`cv:pointer-events-none cv:absolute cv:flex ${at}`}>
			<Slot loading={null}>{children}</Slot>
		</div>
	);
}
