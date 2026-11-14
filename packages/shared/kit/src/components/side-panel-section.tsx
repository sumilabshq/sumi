import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "../utils/cn";

export interface SidePanelSectionProps {
	readonly label: ReactNode;
	readonly action?: ReactNode;
	readonly isGrowing?: boolean | undefined;
	readonly className?: string | undefined;
	readonly children?: ReactNode;
}

export function SidePanelSection({
	label,
	action,
	isGrowing = false,
	className,
	children,
}: SidePanelSectionProps): ReactElement {
	return (
		<section className={cn("wg-kit-side-panel-section", isGrowing && "is-growing", className)}>
			<div className="wg-kit-side-panel-label">
				<span>{label}</span>
				{action ?? null}
			</div>
			<div className="wg-kit-side-panel-rows">{children}</div>
		</section>
	);
}
