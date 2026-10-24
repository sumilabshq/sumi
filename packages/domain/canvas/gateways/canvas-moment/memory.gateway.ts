import type { CanvasField } from "../../shared/schema/canvas-moment.schema.js";
import { momentOpened } from "../../shared/lib/view/canvas-moment.js";
import type { CanvasMoment, MomentWrite } from "../../shared/lib/view/canvas-moment.js";
import { CanvasMomentGateway } from "./canvas-moment.gateway.js";

type MomentListener = (fields: readonly CanvasField[]) => void;

const NOT_OPENED: CanvasMoment = momentOpened({
	app: "",
	page: "",
	isLayersOpen: true,
	mode: "hand",
});

export class MemoryCanvasMomentGateway extends CanvasMomentGateway {
	private readonly listeners = new Set<MomentListener>();
	private held: CanvasMoment = NOT_OPENED;

	override moment(): CanvasMoment {
		return this.held;
	}

	override saveMoment({ moment, fields }: MomentWrite): void {
		this.held = moment;
		for (const listener of [...this.listeners]) {
			listener(fields);
		}
	}

	override momentChanged(listener: MomentListener): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}
}
