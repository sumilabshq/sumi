import type { Job, LiveJob } from "../../schema/job.schema.js";

export abstract class DesignJobs {
	abstract jobs(app: string): readonly Job[];
	abstract onJobs(changed: () => void): () => void;
	abstract liveJob(app: string, id: string): LiveJob | null;
	abstract stopJob(app: string, id: string): Promise<void>;
}
