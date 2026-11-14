import { createElement as h } from "react";
import type { ComponentPropsWithRef, ReactElement, ReactNode } from "react";
import { cn } from "../utils/cn";

export type SidePanelSide = "start" | "end";

export const SIDE_PANEL_MIN_WIDTH = 200;

export interface SidePanelProps {
	readonly side?: SidePanelSide | undefined;
	readonly width: number | string;
	readonly minWidth?: number | undefined;
	readonly label: string;
	readonly edge?: ComponentPropsWithRef<"div"> | undefined;
	readonly edgeLabel?: string | undefined;
	readonly className?: string | undefined;
	readonly children?: ReactNode;
}

export function SidePanel({
	side = "start",
	width,
	minWidth = SIDE_PANEL_MIN_WIDTH,
	label,
	edge,
	edgeLabel,
	className,
	children,
}: SidePanelProps): ReactElement {
	return (
		<aside
			className={cn("wg-kit-side-panel", `is-${side}`, className)}
			style={{
				width,
				minWidth,
			}}
			aria-label={label}
		>
			{children}
			{edge ? (
				<div
					className="wg-kit-side-panel-edge"
					role="separator"
					aria-orientation="vertical"
					aria-label={edgeLabel}
					tabIndex={0}
					{...edge}
				/>
			) : null}
		</aside>
	);
}
