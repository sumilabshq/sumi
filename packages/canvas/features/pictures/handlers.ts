import { handler, refuse } from "@widgetarium/core/requests";
import { DesignDrawing } from "../../adapters/design-drawing/design-drawing.adapter.js";
import { FramePictureTaker } from "../../lib/pictures/frame-picture-taker.js";
import { AskForPictureCommand, FramePictureQuery, PicturesProgressQuery } from "./contract.js";

const NO_PICTURES = "this host takes no pictures of a frame, so every frame stays live";
const PREPARING = "Preparing pictures · {count}";

export const askForPictureHandler = handler(AskForPictureCommand, {
	inject: { framePictures: FramePictureTaker, designDrawing: DesignDrawing },
	run: (ask, { framePictures, designDrawing }) => {
		const { pictureOf } = designDrawing;
		if (!pictureOf) return refuse(NO_PICTURES);
		framePictures.ask([ask], pictureOf);
	},
});

export const framePictureHandler = handler(FramePictureQuery, {
	inject: { framePictures: FramePictureTaker, designDrawing: DesignDrawing },
	run: ({ frame, key, isAtOnce }, { framePictures, designDrawing }) => {
		if (designDrawing.pictureOf === null || isAtOnce) return { url: null, isLiveHidden: false, isAsked: false };
		const url = framePictures.now().shown[frame]?.url ?? null;
		const isCurrent = framePictures.isCurrent(frame, key);
		return { url, isLiveHidden: url !== null && isCurrent, isAsked: !isCurrent };
	},
	watch: (_input, { framePictures }, changed) => framePictures.watch(changed),
});

export const picturesProgressHandler = handler(PicturesProgressQuery, {
	inject: { framePictures: FramePictureTaker },
	run: (_input, { framePictures }) => {
		const { waiting } = framePictures.now();
		return { isShown: waiting > 0, said: PREPARING.replace("{count}", String(waiting)) };
	},
	watch: (_input, { framePictures }, changed) => framePictures.watch(changed),
});
