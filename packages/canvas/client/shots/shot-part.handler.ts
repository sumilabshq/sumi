import { handlerOf } from "@widgetarium/core/mediator";
import type { InputOf, ReturnedOf } from "@widgetarium/core/mediator";
import { DesignSource } from "../../adapters/design-source/design-source.adapter.js";
import { DesignReads } from "../../lib/design/design-reads.js";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { shotPartsOf } from "../../lib/shots/shot-parts.js";
import { ShotPartQuery } from "../../requests/shot-part.query.js";

const NO_PART = "the shot has no part {at}";

export class ShotPartQueryHandler extends handlerOf(ShotPartQuery) {
	private readonly designReads = this.inject(DesignReads);
	private readonly designSource = this.inject(DesignSource);
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle({ at, ...asked }: InputOf<typeof ShotPartQuery>): Promise<ReturnedOf<typeof ShotPartQuery>> {
		const { app } = this.canvasStore.now();
		const design = (await this.designReads.read(app)).design.value;
		const region = shotPartsOf(design, { ...asked, app }, this.designSource.drawing())[at];
		if (!region) throw new Error(NO_PART.replace("{at}", String(at)));
		return { region };
	}
}
