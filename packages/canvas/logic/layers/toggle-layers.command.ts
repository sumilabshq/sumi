import { ICommand } from "@widgetarium/core";
import type { CanvasState } from "../view/canvas-state.js";

export class ToggleLayersCommand extends ICommand {
	constructor(private readonly state: CanvasState) {
		super();
	}

	async run(): Promise<void> {
		this.state.change({ isLayersOpen: !this.state.now().isLayersOpen }, "toggle layers");
	}
}
