import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button } from "@widgetarium/kit";
import { clockOf } from "../../lib/task-times.js";

export interface ContinueLaterProps {
	readonly continueAt: number;
}

const CONTINUE_AT = "Continue at {clock}";

export function ContinueLater({ continueAt }: ContinueLaterProps): ReactElement {
	return (
		<Button variant="link" size="s" className="wg-tasks-resolve" data-tasks-continue="later" disabled>
			{CONTINUE_AT.replace("{clock}", clockOf(continueAt))}
		</Button>
	);
}
