import { z } from "zod";
import { handlerOf, inject, query } from "@widgetarium/core/mediator";
import type { ReturnedOf } from "@widgetarium/core/mediator";
import { FramePictureTaker } from "./frame-picture-taker.js";

export const PicturesProgressQuery = query("canvas/pictures-progress").output(
	z.object({ isShown: z.boolean(), said: z.string() }),
);

const PREPARING = "Preparing pictures · {count}";

export class PicturesProgressQueryHandler extends handlerOf(PicturesProgressQuery) {
	private readonly framePictureTaker = inject(FramePictureTaker);

	override async handle(): Promise<ReturnedOf<typeof PicturesProgressQuery>> {
		const { waiting } = this.framePictureTaker.now();
		return { isShown: waiting > 0, said: PREPARING.replace("{count}", String(waiting)) };
	}

	watch(_input: void, changed: () => void): () => void {
		return this.framePictureTaker.watch(changed);
	}
}
