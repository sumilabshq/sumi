import { useState } from "react";
import type { DragEvent } from "react";
import { useAttachesFiles } from "./use-attaches-files.js";

export interface FileDrop {
	readonly isOver: boolean;
	readonly onDragEnter: (event: DragEvent<HTMLElement>) => void;
	readonly onDragOver: (event: DragEvent<HTMLElement>) => void;
	readonly onDragLeave: (event: DragEvent<HTMLElement>) => void;
	readonly onDrop: (event: DragEvent<HTMLElement>) => void;
}

const FILES = "Files";

export function useDropsFiles(): FileDrop {
	const attach = useAttachesFiles();
	const [isOver, setOver] = useState(false);
	return {
		isOver,
		onDragEnter: (event) => {
			if (!isFileDrag(event)) {
				return;
			}

			setOver(true);
		},
		onDragOver: (event) => {
			if (!isFileDrag(event)) {
				return;
			}

			event.preventDefault();
			event.dataTransfer.dropEffect = "copy";
		},
		onDragLeave: (event) => {
			if (!isFileDrag(event) || isStillInside(event)) {
				return;
			}

			setOver(false);
		},
		onDrop: (event) => {
			if (!isFileDrag(event)) {
				return;
			}

			event.preventDefault();
			setOver(false);
			attach([...event.dataTransfer.files]);
		},
	};
}

function isFileDrag(event: DragEvent<HTMLElement>): boolean {
	return event.dataTransfer.types.includes(FILES);
}

function isStillInside(event: DragEvent<HTMLElement>): boolean {
	return event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget);
}
