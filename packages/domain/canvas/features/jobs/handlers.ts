import { handler } from "@widgetarium/core/requests";
import { AgentJobsGateway } from "../../gateways/agent-jobs/agent-jobs.gateway.js";
import { DesignReads } from "../../shared/lib/design/design-reads.js";
import { pagesNow, watchPages } from "../../shared/lib/pages/pages-now.js";
import { CanvasStore } from "../../shared/lib/view/canvas-store.js";
import { JobStatusQuery, StopJobCommand } from "./contract.js";
import { CanvasClientModule } from "../../module.js";

export const JobStatusQueryHandler = handler(JobStatusQuery, CanvasClientModule)
	.inject({ designReads: DesignReads, agentJobsGateway: AgentJobsGateway, canvasStore: CanvasStore })
	.watch((_input, { designReads, canvasStore }, changed) => watchPages(designReads, canvasStore, changed))
	.handle(async (_input, { designReads, agentJobsGateway, canvasStore }) => {
		const { app, pages } = await pagesNow(designReads, canvasStore);
		const job = pages.shownJob;
		if (!job) return { shown: null };
		const live = agentJobsGateway.liveOf(app, job.id);
		return { shown: { job, spent: live ? live.spent : job.spent } };
	});

export const StopJobCommandHandler = handler(StopJobCommand, CanvasClientModule)
	.inject({ agentJobsGateway: AgentJobsGateway, canvasStore: CanvasStore })
	.handle(({ id }, { agentJobsGateway, canvasStore }) => agentJobsGateway.stop(canvasStore.now().app, id));
