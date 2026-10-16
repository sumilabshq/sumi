import { handlerOf } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { DesignSource } from "../../adapters/design-source/design-source.adapter.js";
import { DesignReads } from "../../lib/design/design-reads.js";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { AddPhotosCommand } from "../../requests/add-photos.command.js";

export class AddPhotosCommandHandler extends handlerOf(AddPhotosCommand) {
	private readonly designReads = this.inject(DesignReads);
	private readonly designSource = this.inject(DesignSource);
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle({ photos }: InputOf<typeof AddPhotosCommand>): Promise<void> {
		const { app } = this.canvasStore.now();
		await this.designSource.addPhotos(app, photos);
		this.designReads.changed(app);
	}
}
