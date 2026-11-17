import type { ViewId } from "../../shared/schema/views.schema.js";
import { ViewsGateway } from "./views.gateway.js";

export class MemoryViewsGateway extends ViewsGateway {
	private held: ViewId | null = null;
	private readonly listeners = new Set<() => void>();

	override chosen(): Promise<ViewId | null> {
		return Promise.resolve(this.held);
	}

	override choose(view: ViewId): Promise<void> {
		this.held = view;

		for (const listener of [...this.listeners]) {
			listener();
		}

		return Promise.resolve();
	}

	override viewsChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}
}
