import type { DragEvent } from "react";
import { useAttachesFiles } from "./use-attaches-files.js";

export interface FileDrop {
	readonly onDragOver: (event: DragEvent<HTMLElement>) => void;
	readonly onDrop: (event: DragEvent<HTMLElement>) => void;
}

const FILES = "Files";

export function useDropsFiles(): FileDrop {
	const attach = useAttachesFiles();
	return {
		onDragOver: (event) => {
			if (!event.dataTransfer.types.includes(FILES)) {
				return;
			}

			event.preventDefault();
			event.dataTransfer.dropEffect = "copy";
		},
		onDrop: (event) => {
			if (event.dataTransfer.files.length === 0) {
				return;
			}

			event.preventDefault();
			attach([...event.dataTransfer.files]);
		},
	};
}
