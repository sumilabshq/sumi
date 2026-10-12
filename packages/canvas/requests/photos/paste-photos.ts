import { z } from "zod";
import { command, handlerOf, inject } from "@widgetarium/core/mediator";
import type { InputOf, ReturnedOf } from "@widgetarium/core/mediator";
import { CanvasHost } from "../../ports/canvas-host.js";
import { DesignSource } from "../../ports/design-source.port.js";
import { DesignReads } from "../design/design-reads.js";
import { CanvasStore } from "../view/canvas-store.js";

export const PastePhotosCommand = command("canvas/paste-photos")
	.input(z.object({ photos: z.array(z.instanceof(File)) }))
	.output(z.object({ isTaken: z.boolean() }))
	.idempotencyKey("per-call");

export class PastePhotosCommandHandler extends handlerOf(PastePhotosCommand) {
	private readonly designReads = inject(DesignReads);
	private readonly designSource = inject(DesignSource);
	private readonly canvasStore = inject(CanvasStore);
	private readonly canvasHost = inject(CanvasHost);

	override async handle({
		photos,
	}: InputOf<typeof PastePhotosCommand>): Promise<ReturnedOf<typeof PastePhotosCommand>> {
		if (!this.canvasHost.ownsPaste()) return { isTaken: false };
		const { app } = this.canvasStore.now();
		await this.designSource.addPhotos(app, photos);
		this.designReads.changed(app);
		return { isTaken: true };
	}
}
