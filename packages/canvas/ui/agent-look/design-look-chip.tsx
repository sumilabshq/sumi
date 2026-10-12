import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Icon } from "@widgetarium/kit";

const LOOKING_AT_DESIGN = "Agent is looking at the whole design";

export function DesignLookChip(): ReactElement {
	return (
		<Button size="s" variant="ghost">
			<Icon name="sparkles" size={14} />
			{LOOKING_AT_DESIGN}
		</Button>
	);
}
