import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { RAISED_PILL } from "../../lib/top-bar/top-bar-look.js";

const TITLE_PILL = `${RAISED_PILL} cv:flex cv:min-w-0 cv:flex-none cv:items-center cv:gap-2 cv:ps-4 cv:pe-1.5`;

export function TitlePill({ children }: { readonly children?: ReactNode }): ReactElement {
	return (
		<div className={TITLE_PILL} data-canvas-title="">
			{children}
		</div>
	);
}
