import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { countText } from "@widgetarium/core/engine/count-text.js";
import { useChatTasks } from "../../lib/use-chat-tasks.js";
import { useReportsRowCount } from "../../lib/use-reports-row-count.js";

export interface LiveTasksCountProps {
	readonly chatId: string;
	readonly onRowsCounted: (count: number) => void;
}

const ONE_TASK = "1 task";
const MANY_TASKS = "{count} tasks";
const SEPARATOR = "·";

export function LiveTasksCount({ chatId, onRowsCounted }: LiveTasksCountProps): ReactElement | null {
	const count = useChatTasks(chatId).length;
	useReportsRowCount(count, onRowsCounted);

	if (count === 0) {
		return null;
	}

	return (
		<Fragment>
			<span className="wg-studio-ai-tools-took">{SEPARATOR}</span>
			<span className="wg-studio-ai-live-tasks-count">{countText(count, ONE_TASK, MANY_TASKS)}</span>
		</Fragment>
	);
}
