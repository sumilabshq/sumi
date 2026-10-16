import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Slot } from "@widgetarium/core/requests";
import { Placed } from "./placed.js";

export interface CanvasLayoutProps {
	readonly header?: ReactNode;
	readonly start?: ReactNode;
	readonly end?: ReactNode;
	readonly bottom?: ReactNode;
	readonly children?: ReactNode;
}

export function CanvasLayout({ header, start, end, bottom, children }: CanvasLayoutProps): ReactElement {
	return (
		<div className="cv:relative cv:h-full cv:w-full cv:overflow-hidden cv:bg-page" data-canvas-view="">
			<Slot>{children}</Slot>
			<Placed at="cv:inset-y-0 cv:left-0 cv:z-[1]">{start}</Placed>
			<Placed at="cv:inset-y-0 cv:right-0 cv:z-[1]">{end}</Placed>
			<Placed at="cv:bottom-4 cv:left-1/2 cv:z-[2] cv:-translate-x-1/2">{bottom}</Placed>
			<Placed at="cv:inset-x-0 cv:top-0 cv:z-[2]">{header}</Placed>
		</div>
	);
}
