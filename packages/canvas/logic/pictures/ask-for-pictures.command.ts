import type { z } from "zod";
import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { ICommand } from "@widgetarium/core";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";
import { PictureAsksSchema } from "../../schemas/frame-picture.schema.js";
import { canvasSourceIn } from "../canvas/canvas-source.js";
import { FRAME_PICTURES } from "./frame-pictures.service.js";

const NO_PICTURES = "this host takes no pictures of a frame, so every frame stays live";

export class AskForPicturesCommand extends ICommand.input(PictureAsksSchema) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run({ asks }: z.output<typeof PictureAsksSchema>): Promise<void> {
		const { pictureOf } = canvasSourceIn(this.ports).design;
		if (!pictureOf) throw new Error(NO_PICTURES);
		FRAME_PICTURES.ask(asks, pictureOf);
	}
}
