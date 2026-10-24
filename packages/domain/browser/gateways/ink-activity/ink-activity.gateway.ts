import type { InkActivity } from "../../shared/schema/ink-activity.schema.js";

export abstract class InkActivityGateway {
	abstract inkActivity(): InkActivity;
	abstract inkActivityChanged(listener: () => void): () => void;
	abstract saveInkActivity(activity: InkActivity): void;
}
