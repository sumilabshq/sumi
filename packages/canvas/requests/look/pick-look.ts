import { z } from "zod";
import { command, handlerOf, inject } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { DesignSource } from "../../ports/design-source.port.js";
import { DesignReads } from "../design/design-reads.js";
import { CanvasStore } from "../view/canvas-store.js";

export const PickLookCommand = command("canvas/pick-look")
	.input(z.object({ settingName: z.string(), option: z.string() }))
	.idempotencyKey("per-call");

export class PickLookCommandHandler extends handlerOf(PickLookCommand) {
	private readonly designReads = inject(DesignReads);
	private readonly designSource = inject(DesignSource);
	private readonly canvasStore = inject(CanvasStore);

	override async handle({ settingName, option }: InputOf<typeof PickLookCommand>): Promise<void> {
		const { app } = this.canvasStore.now();
		await this.designSource.pickLook(app, settingName, option);
		this.designReads.changed(app);
	}
}
