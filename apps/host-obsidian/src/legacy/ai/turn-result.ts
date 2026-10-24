import type { AssistantCall } from "@widgetarium/core/engine/assistant-port.js";
import type { FailedCheck, Tally, TurnResult } from "@widgetarium/core/engine/assistant-cards.js";
import { changedPathOf, clipLine, ourCallOf, ourStepOf } from "./tools.js";

const CHECKING_VERBS: ReadonlySet<string> = new Set(["check", "lint"]);
const REPORT_VERB = "report";
const LONGEST_REASON = 160;

export function turnResultOf(calls: readonly AssistantCall[]): TurnResult | null {
	const answered = calls.filter((call) => call.answered);
	const checks = answered.filter((call) => CHECKING_VERBS.has(ourCallOf(call)?.verb ?? ""));
	const result: TurnResult = {
		changedFiles: changedFilesIn(answered),
		checks: tallyOf(checks),
		features: lastReportOf(answered)?.outputCounts?.features ?? null,
		blockedBy: lastReportOf(answered)?.outputCounts?.blockedBy ?? null,
		failedCheck: failedCheckOf(checks.at(-1)),
	};
	return result.changedFiles > 0 || result.checks || result.features ? result : null;
}

function changedFilesIn(calls: readonly AssistantCall[]): number {
	const changed = calls.filter((call) => !call.failed).map(changedPathOf);
	return new Set(changed.filter((file) => file !== null)).size;
}

function tallyOf(checks: readonly AssistantCall[]): Tally | null {
	if (checks.length === 0) {
		return null;
	}

	return { passed: checks.filter((call) => !call.failed).length, all: checks.length };
}

function lastReportOf(calls: readonly AssistantCall[]): AssistantCall | undefined {
	return calls.filter((call) => !call.failed && ourCallOf(call)?.verb === REPORT_VERB).at(-1);
}

function failedCheckOf(lastCheck: AssistantCall | undefined): FailedCheck | null {
	const ours = lastCheck ? ourCallOf(lastCheck) : null;
	if (!lastCheck?.failed || !ours) {
		return null;
	}

	return { step: ourStepOf(ours), reason: clipLine(lastCheck.output, LONGEST_REASON) };
}
