import type { CanvasField } from "../../shared/schema/canvas-moment.schema.js";
import type { CanvasMoment, MomentWrite } from "../../shared/lib/view/canvas-moment.js";

export abstract class CanvasMomentGateway {
	abstract moment(): CanvasMoment;
	abstract saveMoment(write: MomentWrite): void;
	abstract momentChanged(listener: (fields: readonly CanvasField[]) => void): () => void;
}
