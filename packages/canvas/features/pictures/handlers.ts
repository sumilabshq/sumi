import { handler, refuse } from "@widgetarium/core/requests";
import { DesignDrawing } from "../../adapters/design-drawing/design-drawing.adapter.js";
import { FramePictureTaker } from "./lib/frame-picture-taker.js";
import { AskForPictureCommand, FramePictureQuery, PicturesProgressQuery } from "./contract.js";
import { CanvasClientModule } from "../../module.js";

const NO_PICTURES = "this host takes no pictures of a frame, so every frame stays live";
const PREPARING = "Preparing pictures · {count}";

export const AskForPictureCommandHandler = handler(AskForPictureCommand, CanvasClientModule)
	.inject({ framePictures: FramePictureTaker, designDrawing: DesignDrawing })
	.handle((ask, { framePictures, designDrawing }) => {
		const { pictureOf } = designDrawing;
		if (!pictureOf) return refuse(NO_PICTURES);
		framePictures.ask([ask], pictureOf);
	});

export const FramePictureQueryHandler = handler(FramePictureQuery, CanvasClientModule)
	.inject({ framePictures: FramePictureTaker, designDrawing: DesignDrawing })
	.watch((_input, { framePictures }, changed) => framePictures.watch(changed))
	.handle(({ frame, key, isAtOnce }, { framePictures, designDrawing }) => {
		if (designDrawing.pictureOf === null || isAtOnce) return { url: null, isLiveHidden: false, isAsked: false };
		const url = framePictures.now().shown[frame]?.url ?? null;
		const isCurrent = framePictures.isCurrent(frame, key);
		return { url, isLiveHidden: url !== null && isCurrent, isAsked: !isCurrent };
	});

export const PicturesProgressQueryHandler = handler(PicturesProgressQuery, CanvasClientModule)
	.inject({ framePictures: FramePictureTaker })
	.watch((_input, { framePictures }, changed) => framePictures.watch(changed))
	.handle((_input, { framePictures }) => {
		const { waiting } = framePictures.now();
		return { isShown: waiting > 0, said: PREPARING.replace("{count}", String(waiting)) };
	});
