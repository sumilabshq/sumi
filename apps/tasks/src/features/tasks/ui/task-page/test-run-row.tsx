import { createElement as h, Fragment, useState } from "react";
import type { ReactElement } from "react";
import type { CaseResult, TestCase, TestRun } from "@widgetarium/tasks";
import { Button, Icon } from "@widgetarium/kit";
import { agoOf } from "../../lib/task-times.js";
import { statesSaidOf } from "../../lib/task-counts.js";
import { RUN_RESULT_WORDS } from "../../lib/task-words.js";
import { TestCaseRow } from "./test-case-row.js";

export interface TestRunRowProps {
	readonly run: TestRun;
	readonly number: number;
	readonly cases: readonly TestCase[];
}

const RESULT_ORDER: readonly CaseResult[] = ["passed", "failed", "needs_you", "skipped"];
const RUN = "Run {number}";

export function TestRunRow({ run, number, cases }: TestRunRowProps): ReactElement {
	const [isOpen, setOpen] = useState(false);
	const failed = cases.filter((testCase) => run.results[testCase.id] === "failed");
	return (
		<Fragment>
			<div className="wg-tasks-run" data-tasks-run={number}>
				{failed.length === 0 ? (
					<Icon name="history" size={14} />
				) : (
					<span className="wg-tasks-case-icon" data-result="failed">
						<Icon name="circle-x" size={16} />
					</span>
				)}
				<span>
					<b className="wg-tasks-strong">{RUN.replace("{number}", String(number))}</b>
					{` · ${statesSaidOf(Object.values(run.results), RESULT_ORDER, RUN_RESULT_WORDS)} · ${agoOf(run.at, Date.now())}`}
				</span>
				<span className="wg-tasks-fill" />
				{failed.length === 0 ? null : (
					<Button variant="ghost" size="s" onClick={() => setOpen(!isOpen)}>
						{isOpen ? "Hide" : "Show failures"}
						<Icon name={isOpen ? "chevron-up" : "chevron-down"} size={14} />
					</Button>
				)}
			</div>
			{isOpen ? failed.map((testCase) => <TestCaseRow key={testCase.id} testCase={testCase} run={run} />) : null}
		</Fragment>
	);
}
