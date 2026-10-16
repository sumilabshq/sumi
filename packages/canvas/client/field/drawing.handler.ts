import { handlerOf } from "@widgetarium/core/mediator";
import type { ReturnedOf } from "@widgetarium/core/mediator";
import { DesignSource } from "../../adapters/design-source/design-source.adapter.js";
import { DrawingQuery } from "../../requests/drawing.query.js";

export class DrawingQueryHandler extends handlerOf(DrawingQuery) {
	private readonly designSource = this.inject(DesignSource);

	override async handle(): Promise<ReturnedOf<typeof DrawingQuery>> {
		return this.designSource.drawing();
	}
}
