import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { useLatchesTrue } from "../../lib/use-latches-true.js";

export interface FoldProps {
	readonly isOpen: boolean;
	readonly children: ReactNode;
}

export function Fold({ isOpen, children }: FoldProps): ReactElement {
	const hasOpened = useLatchesTrue(isOpen);
	return (
		<div className={isOpen ? "wg-studio-ai-reveal is-open" : "wg-studio-ai-reveal"} inert={!isOpen}>
			<div className="wg-studio-ai-reveal-inner">{hasOpened ? children : null}</div>
		</div>
	);
}
