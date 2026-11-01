import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { TestPlan, TestRun } from "@widgetarium/tasks";
import { Icon } from "@widgetarium/kit";
import { agoOf } from "../../lib/task-times.js";
import { TestCaseRow } from "./test-case-row.js";
import { TestRunRow } from "./test-run-row.js";

export interface TestPlanBodyProps {
	readonly testPlan: TestPlan;
}

const PASSED = "{passed} of {total} passed";
const NO_RUN = "Not run yet";
const RUN = "Run {number} · {ago} · by {by}";
const STAND_LABEL = "Stand: {stand}";

export function testPlanSaidOf(testPlan: TestPlan): string {
	const last = testPlan.runs.at(-1);
	return last === undefined ? NO_RUN : passedSaidOf(last, testPlan.cases.length);
}

export function isTestPlanPassed(testPlan: TestPlan): boolean {
	const last = testPlan.runs.at(-1);
	return last !== undefined && testPlan.cases.every((testCase) => last.results[testCase.id] === "passed");
}

export function TestPlanBody({ testPlan }: TestPlanBodyProps): ReactElement {
	const last = testPlan.runs.at(-1) ?? null;
	const earlier = testPlan.runs.slice(0, -1).reverse();
	return (
		<div className="wg-tasks-tp">
			<div className="wg-tasks-tph">
				<Icon name={last === null ? "circle-dashed" : "flask-conical"} size={16} />
				<span className="wg-tasks-strong" data-tasks-tests-said="">
					{testPlanSaidOf(testPlan)}
				</span>
				{last === null ? null : <span className="wg-tasks-t2">{runSaidOf(last, testPlan.runs.length)}</span>}
				<span className="wg-tasks-fill" />
				<span className="wg-tasks-chip">{STAND_LABEL.replace("{stand}", testPlan.stand)}</span>
			</div>
			<div className="wg-tasks-cases">
				{testPlan.cases.map((testCase) => (
					<TestCaseRow key={testCase.id} testCase={testCase} run={last} />
				))}
			</div>
			{earlier.map((run, at) => (
				<TestRunRow key={run.at} run={run} number={testPlan.runs.length - 1 - at} cases={testPlan.cases} />
			))}
		</div>
	);
}

function passedSaidOf(run: TestRun, total: number): string {
	const passed = Object.values(run.results).filter((result) => result === "passed").length;
	return PASSED.replace("{passed}", String(passed)).replace("{total}", String(total));
}

function runSaidOf(run: TestRun, number: number): string {
	return RUN.replace("{number}", String(number)).replace("{ago}", agoOf(run.at, Date.now())).replace("{by}", run.by);
}
