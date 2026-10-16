import { NOT_AVAILABLE_ON_HOST } from "@widgetarium/core/engine/studio-host.js";
import type { Job, LiveJob } from "../../shared/schema/job.schema.js";
import { DesignJobs } from "./design-jobs.adapter.js";

export class WebDesignJobs extends DesignJobs {
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
		return Promise.reject(new Error(NOT_AVAILABLE_ON_HOST));
	}
}
