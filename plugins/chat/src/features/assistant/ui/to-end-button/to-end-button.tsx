import { createElement as h } from "react";
import type { ReactNode } from "react";
import { Icon, tooltipMarks, useMessageScroller, useMessageScrollerScrollable } from "@widgetarium/kit";

const TO_END = "Scroll to the latest message";
const ARROW_PX = 16;

export function ToEndButton(): ReactNode {
	const { end } = useMessageScrollerScrollable();
	const { scrollToEnd } = useMessageScroller();

	if (!end) {
		return null;
	}

	return (
		<div className="wg-studio-ai-to-end">
			<button
				className="wg-studio-ai-to-end-button"
				type="button"
				aria-label={TO_END}
				onClick={() => scrollToEnd()}
				{...tooltipMarks({ said: TO_END })}
			>
				<Icon name="arrow-down" size={ARROW_PX} />
			</button>
		</div>
	);
}
