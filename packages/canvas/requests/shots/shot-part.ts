import { z } from "zod";
import { handlerOf, inject, query } from "@widgetarium/core/mediator";
import type { InputOf, ReturnedOf } from "@widgetarium/core/mediator";
import { RegionSchema } from "../../schema/regions.js";
import { DesignSource } from "../../ports/design-source.port.js";
import { DesignReads } from "../design/design-reads.js";
import { CanvasStore } from "../view/canvas-store.js";
import { ShotAskSchema } from "./shot-count.js";
import { shotPartsOf } from "./shot-parts.js";

export const ShotPartQuery = query("canvas/shot-part")
	.input(ShotAskSchema.extend({ at: z.number() }))
	.output(z.object({ region: RegionSchema }));

const NO_PART = "the shot has no part {at}";

export class ShotPartQueryHandler extends handlerOf(ShotPartQuery) {
	private readonly designReads = inject(DesignReads);
	private readonly designSource = inject(DesignSource);
	private readonly canvasStore = inject(CanvasStore);

	override async handle({ at, ...asked }: InputOf<typeof ShotPartQuery>): Promise<ReturnedOf<typeof ShotPartQuery>> {
		const { app } = this.canvasStore.now();
		const design = (await this.designReads.read(app)).design.value;
		const region = shotPartsOf(design, { ...asked, app }, this.designSource.drawing())[at];
		if (!region) throw new Error(NO_PART.replace("{at}", String(at)));
		return { region };
	}
}
