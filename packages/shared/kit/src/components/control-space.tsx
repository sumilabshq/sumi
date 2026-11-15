import { createElement as h, useRef } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { useWindowChromeInset } from "../hooks/use-window-chrome-inset";
import type { ControlSpaceSide } from "../hooks/use-window-chrome-inset";
import { cn } from "../utils/cn";

export type { ControlSpaceSide } from "../hooks/use-window-chrome-inset";

export interface ControlSpaceProps extends HTMLAttributes<HTMLDivElement> {
	readonly side: ControlSpaceSide;
}

export function ControlSpace({ side, className, style, ...rest }: ControlSpaceProps): ReactElement {
	const space = useRef<HTMLDivElement>(null);
	const inset = useWindowChromeInset(space, side);
	return (
		<div
			ref={space}
			role="toolbar"
			{...rest}
			data-control-space={side}
			className={cn("wg-kit-control-space", `is-${side}`, className)}
			style={{
				...style,
				[side === "start" ? "paddingInlineStart" : "paddingInlineEnd"]: inset > 0 ? `${inset}px` : undefined,
			}}
		/>
	);
}
