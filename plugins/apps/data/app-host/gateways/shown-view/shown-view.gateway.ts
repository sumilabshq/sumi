import type { StudioView } from "../../shared/schema/studio-view.schema.js";

export abstract class ShownViewGateway {
	abstract shownView(): StudioView;
	abstract saveShownView(view: StudioView, reason: string): void;
	abstract shownViewChanged(listener: () => void): () => void;
}
