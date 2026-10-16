import type { Job, LiveJob } from "../../schema/job.schema.js";
import { DesignJobs } from "./design-jobs.adapter.js";

export interface AppJobs {
	jobsOf(app: string): readonly Job[];
	liveOf(app: string, id: string): LiveJob | null;
	stop(app: string, id: string): Promise<void>;
	watch(changed: () => void): () => void;
}

export class AssistantDesignJobs extends DesignJobs {
	constructor(private readonly appJobs: AppJobs) {
		super();
	}

	override jobs(app: string): readonly Job[] {
		return this.appJobs.jobsOf(app);
	}

	override onJobs(changed: () => void): () => void {
		return this.appJobs.watch(changed);
	}

	override liveJob(app: string, id: string): LiveJob | null {
		return this.appJobs.liveOf(app, id);
	}

	override stopJob(app: string, id: string): Promise<void> {
		return this.appJobs.stop(app, id);
	}
}
