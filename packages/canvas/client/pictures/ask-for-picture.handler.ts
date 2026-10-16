import { handlerOf } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { DesignSource } from "../../adapters/design-source/design-source.adapter.js";
import { FramePictureTaker } from "../../lib/pictures/frame-picture-taker.js";
import { AskForPictureCommand } from "../../requests/ask-for-picture.command.js";

const NO_PICTURES = "this host takes no pictures of a frame, so every frame stays live";

export class AskForPictureCommandHandler extends handlerOf(AskForPictureCommand) {
	private readonly framePictureTaker = this.inject(FramePictureTaker);
	private readonly designSource = this.inject(DesignSource);

	override async handle(ask: InputOf<typeof AskForPictureCommand>): Promise<void> {
		const { pictureOf } = this.designSource;
		if (!pictureOf) throw new Error(NO_PICTURES);
		this.framePictureTaker.ask([ask], pictureOf);
	}
}
