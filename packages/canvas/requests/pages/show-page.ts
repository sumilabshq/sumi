import { z } from "zod";
import { command, handlerOf, inject } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { CanvasStore } from "../view/canvas-store.js";

export const ShowPageCommand = command("canvas/show-page")
	.input(z.object({ page: z.string() }))
	.idempotencyKey("none");

export class ShowPageCommandHandler extends handlerOf(ShowPageCommand) {
	private readonly canvasStore = inject(CanvasStore);

	override async handle({ page }: InputOf<typeof ShowPageCommand>): Promise<void> {
		this.canvasStore.change({ page }, `show ${page}`);
	}
}
