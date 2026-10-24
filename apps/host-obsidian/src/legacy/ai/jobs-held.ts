import type { Job, JobQuestion } from "@widgetarium/core/app-jobs.js";
import type { EndedBy } from "./job-endings.js";
import type { JobsDoors } from "./job-runner.js";
import type { Run } from "./run.js";

export interface Running {
	readonly run: Run;
	readonly spentBefore: number;
	spentNow: number;
	text: string;
	activity: string | null;
	question: JobQuestion | null;
	endedBy: EndedBy | null;
	unsaved: string[];
}

export interface JobsHeld {
	readonly doors: JobsDoors;
	readonly held: Map<string, Job>;
	readonly running: Map<string, Running>;
	readonly lines: Map<string, string[]>;
	readonly watchers: Set<() => void>;
	isTicking: boolean;
	changes: number;
}
