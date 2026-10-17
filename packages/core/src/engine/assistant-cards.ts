import type { BuildStage } from "../app-spec.js";

export type StepStatus = "pending" | "failed" | "active" | "done";

export interface BuildStep {
	readonly label: string;
	readonly status: StepStatus;
	readonly hint: string;
}

export interface Build {
	readonly key: string;
	readonly widget: string;
	readonly name: string;
	readonly title: string;
	readonly steps: BuildStep[];
	readonly isLive: boolean;
	readonly startedAt: number;
	readonly endedAt: number;
}

export type StageStatus = "done" | "active" | "pending";

export interface StageRow {
	readonly stage: BuildStage;
	readonly said: string;
	readonly status: StageStatus;
}

export interface BuildRun {
	readonly key: string;
	readonly app: string;
	readonly rows: readonly StageRow[];
}

export type ItemStatus = "done" | "active" | "failed" | "cancelled";

export interface InstallRow {
	readonly key: string;
	readonly widget: string;
	readonly status: ItemStatus;
}

export interface BuildRunCard {
	readonly run: BuildRun;
	readonly builds: readonly Build[];
	readonly installs: readonly InstallRow[];
	readonly isRunning: boolean;
}

export interface Tally {
	readonly passed: number;
	readonly all: number;
}

export interface FailedCheck {
	readonly step: string;
	readonly reason: string;
}

export interface Blocker {
	readonly feature: string;
	readonly why: string;
}

export interface TurnResult {
	readonly changedFiles: number;
	readonly checks: Tally | null;
	readonly features: Tally | null;
	readonly blockedBy: Blocker | null;
	readonly failedCheck: FailedCheck | null;
}

export interface TurnCards {
	readonly build: BuildRunCard | null;
	readonly specApp: string | null;
	readonly designApp: string | null;
	readonly result: TurnResult | null;
}

export type PinnedCard =
	| { readonly kind: "run"; readonly run: BuildRun; readonly builds: readonly Build[] }
	| { readonly kind: "build"; readonly build: Build };

export interface ChatCards {
	readonly ofTurns: readonly TurnCards[];
	readonly pinned: PinnedCard | null;
}

export const TASK_PROGRESS = "@default/task-progress";

export const NO_CHAT_CARDS: ChatCards = { ofTurns: [], pinned: null };

export function buildKeyOf(app: string): string {
	return `build-${app}`;
}
