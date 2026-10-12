import { ICommand } from "@widgetarium/core";
import { PhotosSchema } from "../../schemas/photo.schema.js";
import type { Photos } from "../../schemas/photo.schema.js";
import { sourceChanged } from "../design/design-reads.js";
import type { DesignSource } from "../design/design-source.js";
import type { CanvasState } from "../view/canvas-state.js";

export class AddPhotosCommand extends ICommand.input(PhotosSchema) {
	constructor(
		private readonly source: DesignSource,
		private readonly state: CanvasState,
	) {
		super();
	}

	async run({ photos }: Photos): Promise<void> {
		await this.source.addPhotos(this.state.now().app, photos);
		sourceChanged(this.source, this.state.now().app);
	}
}
