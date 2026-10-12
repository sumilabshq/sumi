import { createContext } from "react";
import type { FramePicture, PictureAsk } from "../../../schemas/frame-picture.schema.js";

export interface FramePicturesKit {
	readonly shown: Readonly<Record<string, FramePicture>>;
	readonly ask: (ask: PictureAsk) => void;
}

export const FRAME_PICTURES = createContext<FramePicturesKit | null>(null);
