import type { Drawing } from "../../shared/schema/drawing.schema.js";
import { WidgetDrawingGateway } from "./widget-drawing.gateway.js";

export class HeldWidgetDrawingGateway extends WidgetDrawingGateway {
	constructor(private readonly held: Drawing) {
		super();
	}

	override drawing(): Drawing {
		return this.held;
	}
}
