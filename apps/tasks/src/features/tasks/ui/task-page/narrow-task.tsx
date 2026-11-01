import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { TaskView } from "@widgetarium/tasks";
import { FoldedSections } from "./folded-sections.js";
import { Paragraphs } from "./paragraphs.js";
import { TaskActionBar, hasActionBar } from "./task-action-bar.js";
import { TaskBanner } from "./task-banner.js";
import { TaskChips } from "./task-chips.js";
import { openAtStartOf, sectionsOf } from "./task-sections.js";

export interface NarrowTaskProps {
	readonly view: TaskView;
}

export function NarrowTask({ view }: NarrowTaskProps): ReactElement {
	const hasBar = hasActionBar(view.card);
	return (
		<div className="wg-tasks-narrow">
			<main className="wg-tasks-main">
				<div className="wg-tasks-top">
					<h1 className="wg-tasks-title">{view.card.title}</h1>
					<TaskChips view={view} />
					{hasBar ? null : <TaskBanner card={view.card} showsStatus={false} />}
				</div>
				<div className="wg-tasks-md wg-tasks-t2">
					<Paragraphs view={view} />
				</div>
				<FoldedSections sections={sectionsOf(view)} openAtStart={openAtStartOf(view)} />
			</main>
			{hasBar ? <TaskActionBar card={view.card} /> : null}
		</div>
	);
}
