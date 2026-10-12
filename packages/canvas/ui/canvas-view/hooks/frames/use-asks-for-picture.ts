import { useEffect } from "react";
import type { FramePicturesKit } from "../../field-contexts.js";

export interface PictureAsked {
	readonly node: HTMLDivElement | null;
	readonly frame: string;
	readonly pictureKey: string;
	readonly pictures: FramePicturesKit | null;
}

export function useAsksForPicture({ node, frame, pictureKey, pictures }: PictureAsked): void {
	useEffect(() => {
		if (node && pictures) pictures.ask({ frame, key: pictureKey, node });
	}, [node, frame, pictureKey, pictures]);
}
