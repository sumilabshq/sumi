import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { useRailDrag } from "../hooks/use-rail-drag";
import { cn } from "../utils/cn";

export interface SidebarRailProps extends HTMLAttributes<HTMLDivElement> {
	readonly widthPx: number;
	onWidth(px: number): void;
	onWidthDone(px: number): void;
}

const RESIZE_SIDEBAR = "Resize sidebar";

export function SidebarRail({ widthPx, onWidth, onWidthDone, className, ...rest }: SidebarRailProps): ReactElement {
	const drag = useRailDrag({ widthPx, onWidth, onWidthDone });
	return (
		<div
			role="separator"
			aria-orientation="vertical"
			aria-label={RESIZE_SIDEBAR}
			data-slot="sidebar-rail"
			{...rest}
			{...drag}
			className={cn("wg-kit-side-rail", className)}
		/>
	);
}
