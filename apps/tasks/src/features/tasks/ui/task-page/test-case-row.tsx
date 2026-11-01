import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { TestCase, TestRun } from "@widgetarium/tasks";
import { Icon } from "@widgetarium/kit";
import { CASE_ICONS, CASE_WORDS } from "../../lib/task-words.js";
import type { CaseLook } from "../../lib/task-words.js";

export interface TestCaseRowProps {
	readonly testCase: TestCase;
	readonly run: TestRun | null;
}

const EXPECT = "Expect: {expect}";

export function TestCaseRow({ testCase, run }: TestCaseRowProps): ReactElement {
	const look: CaseLook = run?.results[testCase.id] ?? "not_started";
	const failure = run?.failures[testCase.id] ?? null;
	return (
		<div className="wg-tasks-case" data-tasks-case={testCase.id} data-result={look}>
			<span key={look} className="wg-tasks-case-icon" data-result={look}>
				<Icon name={CASE_ICONS[look]} size={16} />
			</span>
			<div>
				<div className="wg-tasks-strong">{testCase.text}</div>
				{testCase.expect === "" ? null : (
					<div className="wg-tasks-t2 wg-tasks-small">{EXPECT.replace("{expect}", testCase.expect)}</div>
				)}
				{failure === null ? null : <div className="wg-tasks-fail">{failure}</div>}
			</div>
			<div className="wg-tasks-res" data-result={look}>
				{CASE_WORDS[look]}
			</div>
		</div>
	);
}
