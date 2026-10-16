import type { Job, LiveJob } from "../../shared/schema/job.schema.js";
import { notAvailable } from "../../shared/lib/not-available.js";
import { AgentJobsGateway } from "./agent-jobs.gateway.js";

export class WebAgentJobsGateway extends AgentJobsGateway {
	override jobsOf(): readonly Job[] {
		return [];
	}

	override watch(): () => void {
		return () => undefined;
	}

	override liveOf(): LiveJob | null {
		return null;
	}

	override stop(): Promise<void> {
		return notAvailable();
	}
}
