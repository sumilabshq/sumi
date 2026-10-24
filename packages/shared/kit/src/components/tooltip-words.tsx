import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { TooltipSaid } from "../utils/tooltip-marks";

export interface TooltipWordsProps {
	readonly said: TooltipSaid;
	readonly isLeaving: boolean;
}

export function TooltipWords({ said, isLeaving }: TooltipWordsProps): ReactElement {
	return (
		<span
			className={isLeaving ? "wg-kit-tooltip-words is-leaving" : "wg-kit-tooltip-words"}
			aria-hidden={isLeaving || undefined}
		>
			{said.said}
			{said.detail === null ? null : <span className="wg-kit-tooltip-detail">{said.detail}</span>}
			{said.keys === null ? null : <kbd className="wg-kit-tooltip-key">{said.keys}</kbd>}
		</span>
	);
}
