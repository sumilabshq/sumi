import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import type { TaskView } from "@widgetarium/tasks";
import { ActivityList } from "./activity-section.js";
import { CriteriaList, criteriaSaidOf } from "./criteria-section.js";
import { DocumentsList, documentsSaidOf } from "./documents-section.js";
import { PlanList, planSaidOf } from "./plan-section.js";
import { TestPlanBody, isTestPlanPassed, testPlanSaidOf } from "./test-plan-section.js";

export type SectionKey = "criteria" | "plan" | "tests" | "documents" | "activity";

export interface TaskSection {
	readonly key: SectionKey;
	readonly title: string;
	readonly headSaid: string | null;
	readonly foldSaid: string;
	readonly isPassed: boolean;
	readonly body: ReactElement;
}

export interface TaskSectionsProps {
	readonly sections: readonly TaskSection[];
}

export function sectionsOf(view: TaskView): readonly TaskSection[] {
	return [criteriaOf(view), planOf(view), testsOf(view), documentsOf(view), activityOf(view)].flatMap(
		(section) => section ?? [],
	);
}

export function openAtStartOf(view: TaskView): readonly SectionKey[] {
	return view.card.status === "ready_to_test" ? ["tests"] : [];
}

export function WideSections({ sections }: TaskSectionsProps): ReactElement {
	return (
		<Fragment>
			{sections.map((section) => (
				<section key={section.key} className="wg-tasks-section" data-tasks-section={section.key}>
					<h2>
						{section.title} {section.headSaid === null ? null : <span>{section.headSaid}</span>}
					</h2>
					{section.body}
				</section>
			))}
		</Fragment>
	);
}

function criteriaOf({ acceptance }: TaskView): TaskSection | null {
	if (acceptance.length === 0) {
		return null;
	}

	const said = criteriaSaidOf(acceptance);
	return {
		key: "criteria",
		title: "Acceptance criteria",
		headSaid: said,
		foldSaid: said,
		isPassed: false,
		body: <CriteriaList criteria={acceptance} />,
	};
}

function planOf({ plan }: TaskView): TaskSection | null {
	if (plan.length === 0) {
		return null;
	}

	const said = planSaidOf(plan);
	return {
		key: "plan",
		title: "Plan",
		headSaid: said,
		foldSaid: said,
		isPassed: false,
		body: <PlanList plan={plan} />,
	};
}

function testsOf({ testPlan }: TaskView): TaskSection | null {
	if (testPlan === null) {
		return null;
	}

	return {
		key: "tests",
		title: "Test plan",
		headSaid: null,
		foldSaid: testPlanSaidOf(testPlan),
		isPassed: isTestPlanPassed(testPlan),
		body: <TestPlanBody testPlan={testPlan} />,
	};
}

function documentsOf({ documents }: TaskView): TaskSection | null {
	if (documents.length === 0) {
		return null;
	}

	return {
		key: "documents",
		title: "Documents",
		headSaid: String(documents.length),
		foldSaid: documentsSaidOf(documents),
		isPassed: false,
		body: <DocumentsList documents={documents} />,
	};
}

function activityOf({ log }: TaskView): TaskSection | null {
	if (log.length === 0) {
		return null;
	}

	return {
		key: "activity",
		title: "Activity",
		headSaid: null,
		foldSaid: String(log.length),
		isPassed: false,
		body: <ActivityList log={log} />,
	};
}
