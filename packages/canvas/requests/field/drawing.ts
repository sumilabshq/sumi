import { handlerOf, inject, query } from "@widgetarium/core/mediator";
import type { ReturnedOf } from "@widgetarium/core/mediator";
import { DesignSource } from "../../ports/design-source.port.js";
import { DrawingSchema } from "../../schema/drawing.js";

export const DrawingQuery = query("canvas/drawing").output(DrawingSchema);

export class DrawingQueryHandler extends handlerOf(DrawingQuery) {
	private readonly designSource = inject(DesignSource);

	override async handle(): Promise<ReturnedOf<typeof DrawingQuery>> {
		return this.designSource.drawing();
	}
}
