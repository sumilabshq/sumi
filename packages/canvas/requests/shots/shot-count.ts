import { z } from "zod";
import { handlerOf, inject, query } from "@widgetarium/core/mediator";
import type { InputOf, ReturnedOf } from "@widgetarium/core/mediator";
import { DesignSource } from "../../ports/design-source.port.js";
import { DesignReads } from "../design/design-reads.js";
import { CanvasStore } from "../view/canvas-store.js";
import { shotPartsOf } from "./shot-parts.js";

export const ShotAskSchema = z.object({ page: z.string(), frame: z.string() });

export const ShotCountQuery = query("canvas/shot-count")
	.input(ShotAskSchema)
	.output(z.object({ count: z.number() }));

export class ShotCountQueryHandler extends handlerOf(ShotCountQuery) {
	private readonly designReads = inject(DesignReads);
	private readonly designSource = inject(DesignSource);
	private readonly canvasStore = inject(CanvasStore);

	override async handle(asked: InputOf<typeof ShotCountQuery>): Promise<ReturnedOf<typeof ShotCountQuery>> {
		const { app } = this.canvasStore.now();
		const design = (await this.designReads.read(app)).design.value;
		return { count: shotPartsOf(design, { ...asked, app }, this.designSource.drawing()).length };
	}
}
