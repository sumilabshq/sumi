import { handlerOf } from "@widgetarium/core/mediator";
import type { Watching, ReturnedOf } from "@widgetarium/core/mediator";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { ModeQuery } from "../../requests/mode.query.js";

export class ModeQueryHandler extends handlerOf(ModeQuery) {
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle(): Promise<ReturnedOf<typeof ModeQuery>> {
		return { mode: this.canvasStore.now().mode };
	}

	override watch({ changed }: Watching<typeof ModeQuery>): () => void {
		return this.canvasStore.watch(["mode"], changed);
	}
}
