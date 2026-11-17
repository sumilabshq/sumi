import type { ViewId } from "../../shared/schema/views.schema.js";

export abstract class ViewsGateway {
	abstract chosen(): Promise<ViewId | null>;
	abstract choose(view: ViewId, reason: string): Promise<void>;
	abstract viewsChanged(listener: () => void): () => void;
}
