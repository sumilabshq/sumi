import { z } from "zod";
import { command, handlerOf, inject } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { DesignReads } from "../design/design-reads.js";
import { CanvasStore } from "../view/canvas-store.js";
import { pagesNow } from "./pages-now.js";
import { turnedAway } from "./turned-away.js";

export const PickVariantCommand = command("canvas/pick-variant")
	.input(z.object({ screen: z.string() }))
	.idempotencyKey("none");

export class PickVariantCommandHandler extends handlerOf(PickVariantCommand) {
	private readonly designReads = inject(DesignReads);
	private readonly canvasStore = inject(CanvasStore);

	override async handle({ screen }: InputOf<typeof PickVariantCommand>): Promise<void> {
		const asked = this.canvasStore.now().page;
		const { pages } = await pagesNow(this.designReads, this.canvasStore);
		const moment = this.canvasStore.now();
		if (moment.page !== asked) return turnedAway(`show ${screen}`, asked, moment.page);
		const variants = { ...moment.variants, [pages.shown]: screen };
		this.canvasStore.change({ variants }, `show ${screen} on ${pages.shown}`);
	}
}
