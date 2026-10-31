import { createElement as h, useRef } from "react";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { cn } from "../utils/cn";

export interface CollapsePanelProps extends HTMLAttributes<HTMLDivElement> {
	readonly isOpen: boolean;
	readonly slot: string;
	readonly innerClassName?: string | undefined;
}

export function CollapsePanel({
	isOpen,
	slot,
	innerClassName,
	className,
	children,
	...rest
}: CollapsePanelProps): ReactElement {
	const lastShown = useRef<ReactNode>(children);

	if (isOpen) {
		lastShown.current = children;
	}

	return (
		<div
			data-slot={slot}
			{...rest}
			data-state={isOpen ? "open" : "closed"}
			inert={!isOpen}
			className={cn("wg-kit-collapse", className)}
		>
			<div className="wg-kit-collapse-inner">
				<div className={innerClassName}>{lastShown.current}</div>
			</div>
		</div>
	);
}
