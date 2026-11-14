import { createElement as h } from "react";
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";
import { cn } from "../utils/cn";

export interface SidePanelRowProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	readonly icon?: ReactNode;
	readonly label: ReactNode;
	readonly end?: ReactNode;
	readonly depth?: number | undefined;
	readonly isPicked?: boolean | undefined;
	readonly isOpen?: boolean | undefined;
}

const ROW_INSET_PX = 16;
const DEPTH_STEP_PX = 24;

export function sidePanelIndentOf(depth: number): number {
	return ROW_INSET_PX + DEPTH_STEP_PX * depth;
}

export function SidePanelRow({
	icon,
	label,
	end,
	depth = 0,
	isPicked = false,
	isOpen = false,
	className,
	style,
	...rest
}: SidePanelRowProps): ReactElement {
	return (
		<button
			type="button"
			{...rest}
			className={cn("wg-kit-side-panel-row", isPicked && "is-picked", isOpen && "is-open", className)}
			style={{ ...style, paddingLeft: sidePanelIndentOf(depth) }}
			aria-current={isPicked ? "true" : undefined}
		>
			{icon ? <span className="wg-kit-side-panel-icon">{icon}</span> : null}
			<span className="wg-kit-side-panel-name">{label}</span>
			{end ? <span className="wg-kit-side-panel-end">{end}</span> : null}
		</button>
	);
}
