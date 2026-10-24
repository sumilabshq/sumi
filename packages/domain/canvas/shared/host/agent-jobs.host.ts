import { isObject } from "@widgetarium/core/engine/is-object.js";
import { hostObject } from "@widgetarium/core/requests";
import type { Job, LiveJob } from "../schema/job.schema.js";

export interface AgentJobs {
	jobsOf(app: string): readonly Job[];
	liveOf(app: string, id: string): LiveJob | null;
	stop(app: string, id: string): Promise<void>;
	watch(changed: () => void): () => void;
}

export const AgentJobsHost = hostObject<AgentJobs>("AgentJobs", isAgentJobs);

function isAgentJobs(held: unknown): held is AgentJobs {
	return (
		isObject(held) &&
		typeof held["jobsOf"] === "function" &&
		typeof held["liveOf"] === "function" &&
		typeof held["stop"] === "function" &&
		typeof held["watch"] === "function"
	);
}
