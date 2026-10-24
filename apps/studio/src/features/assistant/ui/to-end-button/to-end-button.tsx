import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, IconButton, tooltipMarks } from "@widgetarium/kit";

const TO_END = "Scroll to the latest message";

export function ToEndButton({ toEnd }: { readonly toEnd: () => void }): ReactElement {
	return (
		<div className="wg-studio-ai-to-end">
			<IconButton variant="neutral" size="s" aria-label={TO_END} onClick={toEnd} {...tooltipMarks({ said: TO_END })}>
				<Icon name="arrow-down" />
			</IconButton>
		</div>
	);
}
