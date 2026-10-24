import type { Job, LiveJob } from "../../shared/schema/job.schema.js";

export abstract class AgentJobsGateway {
	abstract jobsOf(app: string): readonly Job[];
	abstract liveJob(app: string, id: string): LiveJob | null;
	abstract stopJob(app: string, id: string): Promise<void>;
	abstract jobsChanged(listener: () => void): () => void;
}
