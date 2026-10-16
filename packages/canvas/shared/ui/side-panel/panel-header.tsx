import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";

export interface PanelHeaderProps {
	readonly title: string;
	readonly children?: ReactNode;
}

export function PanelHeader({ title, children }: PanelHeaderProps): ReactElement {
	return (
		<header className="cv:flex cv:min-h-[var(--wg-kit-control-s)] cv:items-center cv:justify-between cv:px-1.5 cv:pb-1.5 cv:text-base cv:text-muted-foreground">
			<b>{title}</b>
			{children}
		</header>
	);
}
