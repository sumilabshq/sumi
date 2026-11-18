import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";

export interface SidebarDragGhostProps extends HTMLAttributes<HTMLDivElement> {
	readonly left: number;
	readonly top: number;
	readonly width: number;
}

export function SidebarDragGhost({ left, top, width, className, style, ...rest }: SidebarDragGhostProps): ReactElement {
	return (
		<div
			aria-hidden="true"
			data-slot="sidebar-drag-ghost"
			{...rest}
			className={cn("wg-kit-side-ghost", className)}
			style={{
				...style,
				left,
				top,
				width,
			}}
		/>
	);
}
