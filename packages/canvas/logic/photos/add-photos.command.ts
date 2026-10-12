import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { ICommand } from "@widgetarium/core";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";
import { PhotosSchema } from "../../schemas/photo.schema.js";
import type { Photos } from "../../schemas/photo.schema.js";
import { canvasSourceIn } from "../canvas/canvas-source.js";
import { sourceChanged } from "../design/design-reads.js";

export class AddPhotosCommand extends ICommand.input(PhotosSchema) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run({ photos }: Photos): Promise<void> {
		const { design, app } = canvasSourceIn(this.ports);
		await design.addPhotos(app, photos);
		sourceChanged(design, app);
	}
}
