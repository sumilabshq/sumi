import type { ProfilerOnRenderCallback } from "react";
import { Tallies } from "./tallies.js";
import type { TallyRow } from "./tallies.js";

const SLOW_COMMIT_MS = 16;

export interface CommitReport {
	readonly phases: TallyRow[];
	readonly slow: number;
}

export class CommitTimes {
	private readonly phases = new Tallies();
	private slow = 0;

	readonly onRender: ProfilerOnRenderCallback = (_id, phase, actualDuration) => {
		this.phases.add(phase, actualDuration);
		if (actualDuration >= SLOW_COMMIT_MS) {
			this.slow += 1;
		}
	};

	drain(): CommitReport {
		const report = {
			phases: this.phases.drain(3),
			slow: this.slow,
		};
		this.slow = 0;
		return report;
	}
}
