import type { Drawing } from "../../shared/schema/drawing.schema.js";

export abstract class WidgetDrawingGateway {
	abstract drawing(): Drawing;
}
