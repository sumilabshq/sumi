import type { DesignSource } from "../../adapters/design-source/design-source.adapter.js";
import type { DesignReads } from "../design/design-reads.js";
import type { CanvasStore } from "../view/canvas-store.js";
import { pagesNow } from "./pages-now.js";

export abstract class ViewReturn {
	abstract returnToView(): Promise<void>;
}

export class HostViewReturn extends ViewReturn {
	constructor(private readonly returnedByHost: () => Promise<void>) {
		super();
	}

	override returnToView(): Promise<void> {
		return this.returnedByHost();
	}
}

export class DesignSourceViewReturn extends ViewReturn {
	constructor(
		private readonly designReads: DesignReads,
		private readonly designSource: DesignSource,
		private readonly canvasStore: CanvasStore,
	) {
		super();
	}

	override async returnToView(): Promise<void> {
		const { app, pages } = await pagesNow(this.designReads, this.canvasStore);
		await this.designSource.returnToView(app, pages.shown);
	}
}
