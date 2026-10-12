import { z } from "zod";
import { command, handlerOf, inject } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { COMPONENTS_PAGE } from "../../schema/canvas-page.js";
import { CanvasStore } from "../view/canvas-store.js";

export const FocusWidgetCommand = command("canvas/focus-widget")
	.input(z.object({ widget: z.string() }))
	.idempotencyKey("none");

export class FocusWidgetCommandHandler extends handlerOf(FocusWidgetCommand) {
	private readonly canvasStore = inject(CanvasStore);

	override async handle({ widget }: InputOf<typeof FocusWidgetCommand>): Promise<void> {
		this.canvasStore.change({ page: COMPONENTS_PAGE, focusedWidget: widget }, `open ${widget}`);
	}
}
