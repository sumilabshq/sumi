import { useEffect } from "react";
import type { RefObject } from "react";
import { imageFilesIn } from "../../image-files/image-files.js";

const DROPPED_ON = "[data-canvas-view]";

export function useDroppedPhotos(
	anchor: RefObject<HTMLElement | null>,
	onPhotos: (photos: readonly File[]) => void,
): void {
	useEffect(() => {
		const view = anchor.current?.closest<HTMLElement>(DROPPED_ON);
		if (!view) return undefined;
		const onDragOver = (event: DragEvent): void => event.preventDefault();
		const onDrop = (event: DragEvent): void => {
			const photos = imageFilesIn(event.dataTransfer?.files);
			if (photos.length === 0) return;
			event.preventDefault();
			onPhotos(photos);
		};
		view.addEventListener("dragover", onDragOver);
		view.addEventListener("drop", onDrop);
		return () => {
			view.removeEventListener("dragover", onDragOver);
			view.removeEventListener("drop", onDrop);
		};
	}, [anchor, onPhotos]);
}
