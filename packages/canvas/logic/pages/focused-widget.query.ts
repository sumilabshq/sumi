import { IQuery } from "@widgetarium/core";
import { z } from "zod";
import type { CanvasState } from "../view/canvas-state.js";

export class FocusedWidgetQuery extends IQuery.output(z.string().nullable()) {
	readonly settlesNow = true;

	constructor(private readonly state: CanvasState) {
		super();
	}

	get(): string | null {
		return this.state.now().focusedWidget;
	}

	override subscribe(changed: () => void): () => void {
		return this.state.watch(["focusedWidget"], changed);
	}
}
