import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, IconButton } from "@widgetarium/kit";

const TO_END = "Scroll to the latest message";

export function ToEndButton({ toEnd }: { readonly toEnd: () => void }): ReactElement {
	return (
		<div className="wg-studio-ai-to-end">
			<IconButton variant="neutral" size="s" aria-label={TO_END} title={TO_END} onClick={toEnd}>
				<Icon name="arrow-down" />
			</IconButton>
		</div>
	);
}
