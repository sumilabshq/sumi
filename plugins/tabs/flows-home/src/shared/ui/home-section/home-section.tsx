import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";

export interface HomeSectionProps {
	readonly title: string;
	readonly hint?: string;
	readonly children: ReactNode;
}

export function HomeSection({ title, hint, children }: HomeSectionProps): ReactElement {
	return (
		<section className="sumi-home-section" aria-label={title}>
			<div className="sumi-home-heading">
				{title}
				{hint === undefined ? null : <span className="sumi-home-hint">{hint}</span>}
			</div>
			{children}
		</section>
	);
}
