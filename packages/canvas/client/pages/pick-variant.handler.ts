import { handlerOf } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { DesignReads } from "../../lib/design/design-reads.js";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { pagesStill } from "../../lib/pages/pages-still.js";
import { PickVariantCommand } from "../../requests/pick-variant.command.js";

export class PickVariantCommandHandler extends handlerOf(PickVariantCommand) {
	private readonly designReads = this.inject(DesignReads);
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle({ screen }: InputOf<typeof PickVariantCommand>): Promise<void> {
		const now = await pagesStill(this.designReads, this.canvasStore, `show ${screen}`);
		if (!now) return;
		const { shown } = now.pages;
		const variants = { ...this.canvasStore.now().variants, [shown]: screen };
		this.canvasStore.change({ variants }, `show ${screen} on ${shown}`);
	}
}
