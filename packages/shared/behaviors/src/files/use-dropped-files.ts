import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { filesOfType } from "./files-of.js";

export interface FilesDropped {
	readonly scope: string;
	readonly typePrefix: string;
	readonly onFiles: (files: File[]) => void;
}

export function useDroppedFiles(
	anchor: RefObject<HTMLElement | null>,
	{ scope, typePrefix, onFiles }: FilesDropped,
): void {
	const latest = useRef(onFiles);
	latest.current = onFiles;
	useEffect(() => {
		const view = anchor.current?.closest<HTMLElement>(scope);
		if (!view) return undefined;
		const onDragOver = (event: DragEvent): void => event.preventDefault();
		const onDrop = (event: DragEvent): void => {
			const files = filesOfType(event.dataTransfer?.files, typePrefix);
			if (files.length === 0) return;
			event.preventDefault();
			latest.current(files);
		};
		view.addEventListener("dragover", onDragOver);
		view.addEventListener("drop", onDrop);
		return () => {
			view.removeEventListener("dragover", onDragOver);
			view.removeEventListener("drop", onDrop);
		};
	}, [anchor, scope, typePrefix]);
}
