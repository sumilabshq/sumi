import { z } from "zod";
import { command, handlerOf, inject } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { LayerSchema } from "../../schema/layer.js";
import { CanvasStore } from "../view/canvas-store.js";

export const KeepSeenLayersCommand = command("canvas/keep-seen-layers")
	.input(z.object({ key: z.string(), layers: z.array(LayerSchema).readonly() }))
	.idempotencyKey("none");

export class KeepSeenLayersCommandHandler extends handlerOf(KeepSeenLayersCommand) {
	private readonly canvasStore = inject(CanvasStore);

	override async handle({ key, layers }: InputOf<typeof KeepSeenLayersCommand>): Promise<void> {
		const seenLayers = { ...this.canvasStore.now().seenLayers, [key]: layers };
		this.canvasStore.change({ seenLayers }, `read the layers of ${key}`);
	}
}
