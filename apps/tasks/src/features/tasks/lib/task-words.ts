import type {
	BlockerKind,
	CaseResult,
	ClosedWithin,
	CriterionState,
	DocKind,
	StepState,
	TaskKind,
} from "@widgetarium/tasks";

export const KIND_WORDS: Readonly<Record<TaskKind, string>> = {
	code: "code",
	research: "research",
	design: "design",
	ops: "ops",
};

export const BLOCKER_HEADS: Readonly<Record<BlockerKind, string>> = {
	session_silent: "Blocked: the session went silent",
	session_failed: "Blocked: the session failed",
	usage_limit: "Blocked: Claude usage limit reached",
	stalled: "Blocked: no progress for a while",
	interrupted: "Blocked: the turn was interrupted",
	task: "Blocked by another task",
	external: "Blocked",
};

export const CLOSED_WITHIN_WORDS: Readonly<Record<ClosedWithin, string>> = {
	none: "None",
	day: "Last day",
	week: "Last week",
	month: "Last month",
	all: "All",
};

export const CRITERION_WORDS: Readonly<Record<CriterionState, string>> = {
	open: "open",
	met: "met",
	dropped: "dropped",
};

export const STEP_WORDS: Readonly<Record<StepState, string>> = {
	pending: "pending",
	active: "active",
	done: "done",
	skipped: "skipped",
	blocked: "blocked",
	cancelled: "cancelled",
};

export type CaseLook = CaseResult | "not_started";

export const CASE_WORDS: Readonly<Record<CaseLook, string>> = {
	passed: "Passed",
	failed: "Failed",
	skipped: "Skipped",
	needs_you: "Needs you",
	not_started: "Not started",
};

export const RUN_RESULT_WORDS: Readonly<Record<CaseResult, string>> = {
	passed: "passed",
	failed: "failed",
	skipped: "skipped",
	needs_you: "need you",
};

export const CASE_ICONS: Readonly<Record<CaseLook, string>> = {
	passed: "circle-check",
	failed: "circle-x",
	skipped: "circle-slash",
	needs_you: "circle-user",
	not_started: "circle-dashed",
};

export const DOC_WORDS: Readonly<Record<DocKind, string>> = {
	spec: "Spec",
	research: "Research",
	plan: "Plan",
	design: "Design",
	notes: "Notes",
};

export const DOC_ICONS: Readonly<Record<DocKind, string>> = {
	spec: "file-text",
	research: "book-open",
	plan: "list-checks",
	design: "pen-tool",
	notes: "notebook-pen",
};
