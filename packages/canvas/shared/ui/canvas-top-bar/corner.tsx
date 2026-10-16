import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";

export function Corner({ children }: { readonly children?: ReactNode }): ReactElement | null {
	if (!children) return null;
	return (
		<div className="cv:flex cv:h-[var(--wg-studio-band,50px)] cv:items-center cv:gap-parts cv:[--wg-gap-parts:8px]">
			{children}
		</div>
	);
}
