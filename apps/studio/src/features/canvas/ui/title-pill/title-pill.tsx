import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { GHOST_HEIGHT, RAISED_PILL } from "../../lib/top-bar-look.js";
import { useTopBarLook } from "../../lib/top-bar-look-context.js";

const TITLE_PILL = `${RAISED_PILL} cv:flex cv:min-w-0 cv:flex-initial cv:items-center cv:gap-2 cv:ps-4 cv:pe-1.5`;
const TITLE_GHOST = `${GHOST_HEIGHT} cv:flex cv:min-w-0 cv:flex-initial cv:items-center cv:gap-[var(--sumi-sp-1)]`;

export function TitlePill({ children }: { readonly children?: ReactNode }): ReactElement {
	return (
		<div className={useTopBarLook() === "ghost" ? TITLE_GHOST : TITLE_PILL} data-canvas-title="">
			{children}
		</div>
	);
}
