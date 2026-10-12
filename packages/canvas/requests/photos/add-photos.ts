import { z } from "zod";
import { command, handlerOf, inject } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { DesignSource } from "../../ports/design-source.port.js";
import { DesignReads } from "../design/design-reads.js";
import { CanvasStore } from "../view/canvas-store.js";

export const AddPhotosCommand = command("canvas/add-photos")
	.input(z.object({ photos: z.array(z.instanceof(File)) }))
	.idempotencyKey("per-call");

export class AddPhotosCommandHandler extends handlerOf(AddPhotosCommand) {
	private readonly designReads = inject(DesignReads);
	private readonly designSource = inject(DesignSource);
	private readonly canvasStore = inject(CanvasStore);

	override async handle({ photos }: InputOf<typeof AddPhotosCommand>): Promise<void> {
		const { app } = this.canvasStore.now();
		await this.designSource.addPhotos(app, photos);
		this.designReads.changed(app);
	}
}
