import { ICommand } from "@widgetarium/core";
import type { DesignSource } from "../design/design-source.js";
import type { CanvasState } from "../view/canvas-state.js";
import { readPages } from "./read-pages.js";

export type ViewReturn = Pick<DesignSource, "returnToView">;

export class ReturnToViewCommand extends ICommand {
	constructor(
		private readonly source: DesignSource,
		private readonly state: CanvasState,
		private readonly returnTo: ViewReturn = source,
	) {
		super();
	}

	async run(): Promise<void> {
		const { shown } = await readPages(this.source, this.state);
		await this.returnTo.returnToView(this.state.now().app, shown);
	}
}
