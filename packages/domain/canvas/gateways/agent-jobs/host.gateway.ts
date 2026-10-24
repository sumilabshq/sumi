import type { AgentJobs } from "../../shared/host/agent-jobs.host.js";
import type { Job, LiveJob } from "../../shared/schema/job.schema.js";
import { AgentJobsGateway } from "./agent-jobs.gateway.js";

const JOBS_SETTLE_MS = 400;

export class HostAgentJobsGateway extends AgentJobsGateway {
	constructor(private readonly agentJobs: AgentJobs) {
		super();
	}

	override jobsOf(app: string): readonly Job[] {
		return this.agentJobs.jobsOf(app);
	}

	override liveJob(app: string, id: string): LiveJob | null {
		return this.agentJobs.liveOf(app, id);
	}

	override stopJob(app: string, id: string): Promise<void> {
		return this.agentJobs.stop(app, id);
	}

	// TRADE-OFF: a running agent tells every streamed line, so a burst is told once when it settles
	override jobsChanged(listener: () => void): () => void {
		const settling: { timer: number | null } = { timer: null };
		const told = (): void => {
			settling.timer = null;
			listener();
		};
		const stopWatching = this.agentJobs.watch(() => {
			settling.timer ??= window.setTimeout(told, JOBS_SETTLE_MS);
		});
		return () => {
			stopWatching();

			if (settling.timer !== null) {
				window.clearTimeout(settling.timer);
			}
		};
	}
}
