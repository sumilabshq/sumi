import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";

export interface FoldBoxProps {
	readonly isOpen: boolean;
	readonly movesWhileArranging?: boolean;
	readonly children: ReactNode;
}

const MOVING =
	"cv:grid cv:flex-none cv:grid-rows-[0fr] cv:[transition:grid-template-rows_var(--sumi-dur-slow)_var(--sumi-ease)] cv:motion-reduce:transition-none cv:data-[open]:grid-rows-[1fr]";
const STILL_WHILE_ARRANGING = `${MOVING} cv:in-data-[tabs-arranging]:transition-none`;
const INSIDE = "cv:min-h-0 cv:min-w-0 cv:overflow-x-visible cv:overflow-y-clip";

export function FoldBox({ isOpen, movesWhileArranging = false, children }: FoldBoxProps): ReactElement {
	return (
		<div
			className={movesWhileArranging ? MOVING : STILL_WHILE_ARRANGING}
			data-open={isOpen || undefined}
			inert={!isOpen}
			data-fold-box=""
		>
			<div className={INSIDE}>{children}</div>
		</div>
	);
}
