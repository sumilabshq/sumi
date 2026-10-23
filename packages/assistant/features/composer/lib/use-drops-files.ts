import { useEffect } from "react";
import type { DragEvent } from "react";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { AttachDroppedCommand, FileDragQuery, HearPageDragCommand } from "../contract.js";
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
	const hearPageDrag = useCommand(HearPageDragCommand);
	const attachDropped = useCommand(AttachDroppedCommand);
	const { data: drag } = useQuery(FileDragQuery);
	const { dropped } = drag;
	useEffect(() => {
		if (dropped === null) {
			return;
		}

		void attachDropped.run({ id: dropped });
	}, [dropped]);
	return {
		isOver: drag.isOver,
		onDragEnter: (event) => {
			if (!isFileDrag(event)) {
				return;
			}

			void hearPageDrag.run({ drag: "enter" });
		},
		onDragOver: (event) => {
			if (!isFileDrag(event)) {
				return;
			}

			event.preventDefault();
			event.dataTransfer.dropEffect = "copy";
		},
		onDragLeave: (event) => {
			if (!isFileDrag(event)) {
				return;
			}

			void hearPageDrag.run({ drag: "leave" });
		},
		onDrop: (event) => {
			if (!isFileDrag(event)) {
				return;
			}

			event.preventDefault();
			void hearPageDrag.run({ drag: "drop" });
			attach([...event.dataTransfer.files]);
		},
	};
}

function isFileDrag(event: DragEvent<HTMLElement>): boolean {
	return event.dataTransfer.types.includes(FILES);
}
