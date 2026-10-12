import { useEffect } from "react";
import type { Photos } from "../../../schemas/photo.schema.js";
import { imageFilesIn } from "../../image-files/image-files.js";

export function usePastedPhotos(ownsPaste: (() => boolean) | null, addPhotos: (ask: Photos) => unknown): void {
	useEffect(() => {
		if (!ownsPaste) return undefined;
		const onPaste = (event: ClipboardEvent): void => {
			if (!ownsPaste()) return;
			const photos = imageFilesIn(event.clipboardData?.files);
			if (photos.length === 0) return;
			event.preventDefault();
			addPhotos({ photos });
		};
		document.addEventListener("paste", onPaste);
		return () => document.removeEventListener("paste", onPaste);
	}, [ownsPaste, addPhotos]);
}
