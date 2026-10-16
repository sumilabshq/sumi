import { NOT_AVAILABLE_ON_HOST } from "@widgetarium/core/engine/studio-host.js";
import type { Job, LiveJob } from "../../schema/job.schema.js";
import { DesignJobs } from "./design-jobs.adapter.js";

export class ProjectDesignJobs extends DesignJobs {
	override jobs(): readonly Job[] {
		return [];
	}

	override onJobs(): () => void {
		return () => undefined;
	}

	override liveJob(): LiveJob | null {
		return null;
	}

	override stopJob(): Promise<void> {
		return Promise.reject(new Error(NOT_AVAILABLE_ON_HOST));
	}
}
