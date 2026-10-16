import { handlerOf } from "@widgetarium/core/mediator";
import type { Watching, ReturnedOf } from "@widgetarium/core/mediator";
import { FramePictureTaker } from "../../lib/pictures/frame-picture-taker.js";
import { PicturesProgressQuery } from "../../requests/pictures-progress.query.js";

const PREPARING = "Preparing pictures · {count}";

export class PicturesProgressQueryHandler extends handlerOf(PicturesProgressQuery) {
	private readonly framePictureTaker = this.inject(FramePictureTaker);

	override async handle(): Promise<ReturnedOf<typeof PicturesProgressQuery>> {
		const { waiting } = this.framePictureTaker.now();
		return { isShown: waiting > 0, said: PREPARING.replace("{count}", String(waiting)) };
	}

	override watch({ changed }: Watching<typeof PicturesProgressQuery>): () => void {
		return this.framePictureTaker.watch(changed);
	}
}
