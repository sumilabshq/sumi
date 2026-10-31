import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";

export interface FoldBoxProps {
	readonly isOpen: boolean;
	readonly children: ReactNode;
}

const FOLD =
	"cv:grid cv:grid-rows-[0fr] cv:opacity-0 cv:[transition:grid-template-rows_var(--sumi-dur-slow)_var(--sumi-ease),opacity_var(--sumi-dur-base)_var(--sumi-ease-out)] cv:motion-reduce:transition-none cv:in-data-[tabs-arranging]:transition-none cv:data-[open]:grid-rows-[1fr] cv:data-[open]:opacity-100";
const INSIDE = "cv:min-h-0 cv:overflow-hidden";

export function FoldBox({ isOpen, children }: FoldBoxProps): ReactElement {
	return (
		<div className={FOLD} data-open={isOpen || undefined} inert={!isOpen} data-fold-box="">
			<div className={INSIDE}>{children}</div>
		</div>
	);
}
