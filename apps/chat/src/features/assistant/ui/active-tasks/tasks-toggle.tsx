import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { countText } from "@widgetarium/core/engine/count-text.js";

export interface TasksToggleProps {
	readonly count: number;
	readonly isOpen: boolean;
	readonly onToggle: () => void;
}

const ONE_TASK = "1 task";
const MANY_TASKS = "{count} tasks";
const SEPARATOR = "·";

export function TasksToggle({ count, isOpen, onToggle }: TasksToggleProps): ReactElement {
	return (
		<button className="wg-studio-ai-live-tasks-toggle" type="button" aria-expanded={isOpen} onClick={onToggle}>
			<span className="wg-studio-ai-live-tasks-separator" aria-hidden="true">
				{SEPARATOR}
			</span>
			<span className="wg-studio-ai-live-tasks-count">{countText(count, ONE_TASK, MANY_TASKS)}</span>
			<Icon
				name="chevron-right"
				size={12}
				className={isOpen ? "wg-studio-ai-tools-chevron is-open" : "wg-studio-ai-tools-chevron"}
			/>
		</button>
	);
}
