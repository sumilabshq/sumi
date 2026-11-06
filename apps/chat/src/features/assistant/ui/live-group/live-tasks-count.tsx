import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { countText } from "@widgetarium/core/engine/count-text.js";

const ONE_TASK = "1 task";
const MANY_TASKS = "{count} tasks";
const SEPARATOR = "·";

export function LiveTasksCount({ tasks }: { readonly tasks: number }): ReactElement {
	return (
		<Fragment>
			<span className="wg-studio-ai-tools-took">{SEPARATOR}</span>
			<span className="wg-studio-ai-live-tasks-count">{countText(tasks, ONE_TASK, MANY_TASKS)}</span>
		</Fragment>
	);
}
