import { handlerOf } from "@widgetarium/core/mediator";
import type { InputOf, RequestContext, ReturnedOf } from "@widgetarium/core/mediator";
import { CanvasHost } from "../../adapters/canvas-host/canvas-host.adapter.js";
import { AddPhotosCommand } from "../../requests/add-photos.command.js";
import { PastePhotosCommand } from "../../requests/paste-photos.command.js";

export class PastePhotosCommandHandler extends handlerOf(PastePhotosCommand) {
	private readonly canvasHost = this.inject(CanvasHost);

	override async handle(
		{ photos }: InputOf<typeof PastePhotosCommand>,
		{ idempotencyKey }: RequestContext,
	): Promise<ReturnedOf<typeof PastePhotosCommand>> {
		if (!this.canvasHost.ownsPaste()) return { isTaken: false };
		const added = await this.send(AddPhotosCommand, { photos }, { idempotencyKey: `pasted ${idempotencyKey ?? ""}` });
		if (!added.ok) throw new Error(added.reason);
		return { isTaken: true };
	}
}
