import { z } from "zod";
import { handlerOf, inject, query } from "@widgetarium/core/mediator";
import type { ReturnedOf } from "@widgetarium/core/mediator";
import { RegionSchema } from "../../schema/regions.js";
import { DesignSource } from "../../ports/design-source.port.js";
import { DesignReads } from "../design/design-reads.js";
import { pagesNow, watchPages } from "../pages/pages-now.js";
import { CanvasStore } from "../view/canvas-store.js";
import { regionsOf } from "./regions-of.js";

export const FieldRegionsQuery = query("canvas/field-regions").output(z.object({ regions: z.array(RegionSchema) }));

export class FieldRegionsQueryHandler extends handlerOf(FieldRegionsQuery) {
	private readonly designReads = inject(DesignReads);
	private readonly designSource = inject(DesignSource);
	private readonly canvasStore = inject(CanvasStore);

	override async handle(): Promise<ReturnedOf<typeof FieldRegionsQuery>> {
		return { regions: regionsOf(await pagesNow(this.designReads, this.canvasStore), this.designSource.drawing()) };
	}

	watch(_input: void, changed: () => void): () => void {
		return watchPages(this.designReads, this.canvasStore, changed);
	}
}
