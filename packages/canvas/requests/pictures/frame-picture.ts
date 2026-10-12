import { z } from "zod";
import { handlerOf, inject, query } from "@widgetarium/core/mediator";
import type { InputOf, ReturnedOf } from "@widgetarium/core/mediator";
import { DesignSource } from "../../ports/design-source.port.js";
import { FramePictureTaker } from "./frame-picture-taker.js";

export const FramePictureQuery = query("canvas/frame-picture")
	.input(z.object({ frame: z.string(), key: z.string(), isAtOnce: z.boolean() }))
	.output(z.object({ url: z.string().nullable(), isLiveHidden: z.boolean(), isAsked: z.boolean() }));

export class FramePictureQueryHandler extends handlerOf(FramePictureQuery) {
	private readonly framePictureTaker = inject(FramePictureTaker);
	private readonly designSource = inject(DesignSource);

	override async handle({
		frame,
		key,
		isAtOnce,
	}: InputOf<typeof FramePictureQuery>): Promise<ReturnedOf<typeof FramePictureQuery>> {
		const picture =
			this.designSource.pictureOf === null || isAtOnce ? undefined : this.framePictureTaker.now().shown[frame];
		const isFresh = picture?.key === key;
		const url = picture?.url ?? null;
		return {
			url,
			isLiveHidden: url !== null && isFresh,
			isAsked: this.designSource.pictureOf !== null && !isAtOnce && !isFresh,
		};
	}

	watch(_input: InputOf<typeof FramePictureQuery>, changed: () => void): () => void {
		return this.framePictureTaker.watch(changed);
	}
}
