import { handlerOf } from "@widgetarium/core/mediator";
import type { Watching, InputOf, ReturnedOf } from "@widgetarium/core/mediator";
import { DesignSource } from "../../adapters/design-source/design-source.adapter.js";
import { FramePictureTaker } from "../../lib/pictures/frame-picture-taker.js";
import { FramePictureQuery } from "../../requests/frame-picture.query.js";

export class FramePictureQueryHandler extends handlerOf(FramePictureQuery) {
	private readonly framePictureTaker = this.inject(FramePictureTaker);
	private readonly designSource = this.inject(DesignSource);

	override async handle({
		frame,
		key,
		isAtOnce,
	}: InputOf<typeof FramePictureQuery>): Promise<ReturnedOf<typeof FramePictureQuery>> {
		if (this.designSource.pictureOf === null || isAtOnce) return { url: null, isLiveHidden: false, isAsked: false };
		const url = this.framePictureTaker.now().shown[frame]?.url ?? null;
		const isCurrent = this.framePictureTaker.isCurrent(frame, key);
		return { url, isLiveHidden: url !== null && isCurrent, isAsked: !isCurrent };
	}

	override watch({ changed }: Watching<typeof FramePictureQuery>): () => void {
		return this.framePictureTaker.watch(changed);
	}
}
