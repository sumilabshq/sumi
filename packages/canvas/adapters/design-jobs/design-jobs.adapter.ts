import type { Job, LiveJob } from "../../shared/schema/job.schema.js";

export abstract class DesignJobs {
	abstract jobsOf(app: string): readonly Job[];
	abstract watch(changed: () => void): () => void;
	abstract liveOf(app: string, id: string): LiveJob | null;
	abstract stop(app: string, id: string): Promise<void>;
}
