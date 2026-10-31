import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import type { TaskView } from "@widgetarium/tasks";
import { useTaskPageLayout } from "../../lib/use-task-page-layout.js";
import { useRereadsAtContinue } from "../../lib/use-rereads-at-continue.js";
import { NarrowTask } from "./narrow-task.js";
import { TaskHeader } from "./task-header.js";
import { WideTask } from "./wide-task.js";

export interface TaskShownProps {
	readonly view: TaskView;
}

export function TaskShown({ view }: TaskShownProps): ReactElement {
	useRereadsAtContinue([view.card]);
	const pageRef = useRef<HTMLDivElement>(null);
	const layout = useTaskPageLayout(pageRef);
	const isNarrow = layout === "narrow";
	return (
		<div
			ref={pageRef}
			className="wg-tasks-page"
			data-tasks-task={view.card.id}
			data-narrow={isNarrow ? "" : undefined}
			data-tasks-layout={layout}
		>
			<TaskHeader task={view.card.id} owner={view.card.owner} isNarrow={isNarrow} />
			{isNarrow ? <NarrowTask view={view} /> : <WideTask view={view} hasSide={layout === "wide"} />}
		</div>
	);
}
