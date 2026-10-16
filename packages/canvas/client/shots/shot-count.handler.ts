import { handlerOf } from "@widgetarium/core/mediator";
import type { InputOf, ReturnedOf } from "@widgetarium/core/mediator";
import { DesignSource } from "../../adapters/design-source/design-source.adapter.js";
import { DesignReads } from "../../lib/design/design-reads.js";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { shotPartsOf } from "../../lib/shots/shot-parts.js";
import { ShotCountQuery } from "../../requests/shot-count.query.js";

export class ShotCountQueryHandler extends handlerOf(ShotCountQuery) {
	private readonly designReads = this.inject(DesignReads);
	private readonly designSource = this.inject(DesignSource);
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle(asked: InputOf<typeof ShotCountQuery>): Promise<ReturnedOf<typeof ShotCountQuery>> {
		const { app } = this.canvasStore.now();
		const design = (await this.designReads.read(app)).design.value;
		return { count: shotPartsOf(design, { ...asked, app }, this.designSource.drawing()).length };
	}
}
