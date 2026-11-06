import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, tooltipMarks } from "@widgetarium/kit";

const TO_END = "Scroll to the latest message";
const ARROW_PX = 16;

export function ToEndButton({ toEnd }: { readonly toEnd: () => void }): ReactElement {
	return (
		<div className="wg-studio-ai-to-end">
			<button
				className="wg-studio-ai-to-end-button"
				type="button"
				aria-label={TO_END}
				onClick={toEnd}
				{...tooltipMarks({ said: TO_END })}
			>
				<Icon name="arrow-down" size={ARROW_PX} />
			</button>
		</div>
	);
}
