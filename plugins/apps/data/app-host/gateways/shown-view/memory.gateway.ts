import type { StudioView } from "../../shared/schema/studio-view.schema.js";
import { ShownViewGateway } from "./shown-view.gateway.js";

export class MemoryShownViewGateway extends ShownViewGateway {
	private readonly listeners = new Set<() => void>();

	constructor(private held: StudioView) {
		super();
	}

	shownView(): StudioView {
		return this.held;
	}

	saveShownView(view: StudioView): void {
		this.held = view;
		for (const listener of [...this.listeners]) {
			listener();
		}
	}

	shownViewChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}
}
