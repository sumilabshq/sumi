import { z } from "zod";
import { command, handlerOf, inject } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { DesignSource } from "../../ports/design-source.port.js";
import { CanvasStore } from "../view/canvas-store.js";

export const StopJobCommand = command("canvas/stop-job")
	.input(z.object({ id: z.string() }))
	.idempotencyKey("per-call");

export class StopJobCommandHandler extends handlerOf(StopJobCommand) {
	private readonly designSource = inject(DesignSource);
	private readonly canvasStore = inject(CanvasStore);

	override async handle({ id }: InputOf<typeof StopJobCommand>): Promise<void> {
		await this.designSource.stopJob(this.canvasStore.now().app, id);
	}
}
