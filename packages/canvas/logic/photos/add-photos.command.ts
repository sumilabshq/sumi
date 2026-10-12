import { ICommand } from "@widgetarium/core";
import { PhotosSchema } from "../../schemas/photo.schema.js";
import type { Photos } from "../../schemas/photo.schema.js";
import { sourceChanged } from "../design/design-reads.js";
import type { DesignSource } from "../design/design-source.js";

export class AddPhotosCommand extends ICommand.input(PhotosSchema) {
	constructor(
		private readonly source: DesignSource,
		private readonly app: string,
	) {
		super();
	}

	async run({ photos }: Photos): Promise<void> {
		await this.source.addPhotos(this.app, photos);
		sourceChanged(this.source, this.app);
	}
}
