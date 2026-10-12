import { command, handlerOf, inject } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { DesignSource } from "../../ports/design-source.port.js";
import { PictureAskSchema } from "../../schema/frame-picture.js";
import { FramePictureTaker } from "./frame-picture-taker.js";

export const AskForPictureCommand = command("canvas/ask-for-picture").input(PictureAskSchema).idempotencyKey("none");

const NO_PICTURES = "this host takes no pictures of a frame, so every frame stays live";

export class AskForPictureCommandHandler extends handlerOf(AskForPictureCommand) {
	private readonly framePictureTaker = inject(FramePictureTaker);
	private readonly designSource = inject(DesignSource);

	override async handle(ask: InputOf<typeof AskForPictureCommand>): Promise<void> {
		const { pictureOf } = this.designSource;
		if (!pictureOf) throw new Error(NO_PICTURES);
		this.framePictureTaker.ask([ask], pictureOf);
	}
}
