import type { z } from "zod";
import { ICommand } from "@widgetarium/core";
import { PictureAsksSchema } from "../../schemas/frame-picture.schema.js";
import type { DesignSource } from "../design/design-source.js";
import type { FramePicturesService } from "./frame-pictures.service.js";

const NO_PICTURES = "this host takes no pictures of a frame, so every frame stays live";

export class AskForPicturesCommand extends ICommand.input(PictureAsksSchema) {
	constructor(
		private readonly source: DesignSource,
		private readonly pictures: FramePicturesService,
	) {
		super();
	}

	async run({ asks }: z.output<typeof PictureAsksSchema>): Promise<void> {
		const { pictureOf } = this.source;
		if (!pictureOf) throw new Error(NO_PICTURES);
		this.pictures.ask(asks, pictureOf);
	}
}
