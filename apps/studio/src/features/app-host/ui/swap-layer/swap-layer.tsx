import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";

export interface SwapLayerProps {
	readonly isShown: boolean;
	readonly children: ReactNode;
}

const LAYER =
	"cv:min-w-0 cv:[grid-area:1/1] cv:opacity-0 cv:transition-opacity cv:duration-(--sumi-dur-base) cv:ease-(--sumi-ease-out) cv:motion-reduce:transition-none cv:in-data-[tabs-arranging]:transition-none cv:data-[open]:opacity-100";

export function SwapLayer({ isShown, children }: SwapLayerProps): ReactElement {
	return (
		<div className={LAYER} data-open={isShown || undefined} inert={!isShown} data-fold-box="">
			{children}
		</div>
	);
}
