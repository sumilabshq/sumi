import { ICommand } from "@widgetarium/core";
import type { DesignSource } from "../design/design-source.js";
import type { CanvasState } from "../view/canvas-state.js";
import { readPages } from "./read-pages.js";

export class ReturnToViewCommand extends ICommand {
	constructor(
		private readonly source: DesignSource,
		private readonly app: string,
		private readonly state: CanvasState,
	) {
		super();
	}

	async run(): Promise<void> {
		const { shown } = await readPages(this.source, this.app, this.state);
		await this.source.returnToView(this.app, shown);
	}
}
