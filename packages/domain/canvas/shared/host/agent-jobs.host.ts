import type { Job, LiveJob } from "../schema/job.schema.js";

export interface AgentJobs {
	jobsOf(app: string): readonly Job[];
	liveOf(app: string, id: string): LiveJob | null;
	stop(app: string, id: string): Promise<void>;
	watch(changed: () => void): () => void;
}
