import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";

export interface PanelHeaderProps {
	readonly title: string;
	readonly children?: ReactNode;
}

const EYEBROW =
	"cv:box-border cv:flex cv:min-h-7 cv:flex-none cv:items-center cv:justify-between cv:px-2.5 cv:pt-2 cv:pb-1 cv:text-xs cv:font-medium cv:text-muted-foreground";

export function PanelHeader({ title, children }: PanelHeaderProps): ReactElement {
	return (
		<header className={EYEBROW} data-canvas-eyebrow="">
			<span>{title}</span>
			{children}
		</header>
	);
}
