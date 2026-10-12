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
		if (this.designSource.pictureOf === null || isAtOnce) return { url: null, isLiveHidden: false, isAsked: false };
		const url = this.framePictureTaker.now().shown[frame]?.url ?? null;
		const isCurrent = this.framePictureTaker.isCurrent(frame, key);
		return { url, isLiveHidden: url !== null && isCurrent, isAsked: !isCurrent };
	}

	watch(_input: InputOf<typeof FramePictureQuery>, changed: () => void): () => void {
		return this.framePictureTaker.watch(changed);
	}
}
