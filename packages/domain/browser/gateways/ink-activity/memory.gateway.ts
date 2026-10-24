import type { InkActivity } from "../../shared/schema/ink-activity.schema.js";
import { InkActivityGateway } from "./ink-activity.gateway.js";

const NO_INK_ACTIVITY: InkActivity = {
	reading: null,
	contentReadAt: null,
	stoppedAt: null,
};

export class MemoryInkActivityGateway extends InkActivityGateway {
	private readonly listeners = new Set<() => void>();
	private activity: InkActivity = NO_INK_ACTIVITY;

	inkActivity(): InkActivity {
		return this.activity;
	}

	inkActivityChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}

	saveInkActivity(activity: InkActivity): void {
		this.activity = activity;
		for (const changed of [...this.listeners]) {
			changed();
		}
	}
}
