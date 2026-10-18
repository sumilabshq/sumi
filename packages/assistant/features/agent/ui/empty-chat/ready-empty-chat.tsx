import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";

const EMPTY_LEAD = "Tell me what this screen should do.";
const EMPTY_SAID = "I will find the widgets, put them on the board one at a time, and bind them to your notes.";

export function ReadyEmptyChat(): ReactElement {
	return (
		<div className="wg-studio-ai-empty">
			<Icon name="sparkle" size={28} />
			<p className="wg-studio-ai-empty-lead">{EMPTY_LEAD}</p>
			<p className="wg-studio-ai-empty-said">{EMPTY_SAID}</p>
		</div>
	);
}
