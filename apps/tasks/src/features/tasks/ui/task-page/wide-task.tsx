import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { TaskView } from "@widgetarium/tasks";
import { Paragraphs, paragraphsOf } from "./paragraphs.js";
import { TaskBanner } from "./task-banner.js";
import { TaskChips } from "./task-chips.js";
import { WideSections, sectionsOf } from "./task-sections.js";
import { TaskSide } from "./task-side.js";

export interface WideTaskProps {
	readonly view: TaskView;
	readonly hasSide: boolean;
}

const DESCRIPTION = "Description";

export function WideTask({ view, hasSide }: WideTaskProps): ReactElement {
	return (
		<div className="wg-tasks-wide">
			<main className="wg-tasks-main">
				<div className="wg-tasks-top">
					<h1 className="wg-tasks-title">{view.card.title}</h1>
					{hasSide ? null : <TaskChips view={view} />}
					<TaskBanner card={view.card} showsStatus={hasSide} />
				</div>
				{paragraphsOf(view).length === 0 ? null : (
					<section className="wg-tasks-section wg-tasks-md">
						<h2>{DESCRIPTION}</h2>
						<Paragraphs view={view} />
					</section>
				)}
				<WideSections sections={sectionsOf(view)} />
			</main>
			{hasSide ? <TaskSide view={view} /> : null}
		</div>
	);
}
