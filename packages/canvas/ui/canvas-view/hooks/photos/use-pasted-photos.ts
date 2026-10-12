import { useEffect } from "react";
import { imageFilesIn } from "../../../image-files/image-files.js";

export function usePastedPhotos(ownsPaste: (() => boolean) | null, onPhotos: (photos: readonly File[]) => void): void {
	useEffect(() => {
		if (!ownsPaste) return undefined;
		const onPaste = (event: ClipboardEvent): void => {
			if (!ownsPaste()) return;
			const photos = imageFilesIn(event.clipboardData?.files);
			if (photos.length === 0) return;
			event.preventDefault();
			onPhotos(photos);
		};
		document.addEventListener("paste", onPaste);
		return () => document.removeEventListener("paste", onPaste);
	}, [ownsPaste, onPhotos]);
}
