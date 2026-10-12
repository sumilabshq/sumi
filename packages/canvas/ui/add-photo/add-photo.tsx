import { createElement as h, useRef } from "react";
import type { ChangeEvent, ReactElement } from "react";
import { Icon, IconButton } from "@widgetarium/kit";
import { useCommand } from "@widgetarium/core/mediator";
import { filesOfType, useDroppedFiles, usePastedFiles } from "@widgetarium/behaviors";
import { AddPhotosCommand } from "../../requests/photos/add-photos.js";
import { PastePhotosCommand } from "../../requests/photos/paste-photos.js";
import { Tip } from "../tip/tip.js";

const ADD_PHOTO = "Add photo";
const ADD_PHOTO_SAID = "Add a reference photo, or drop or paste one on the canvas";
const IMAGES = "image/";
const DROPPED_ON = "[data-canvas-view]";

export function AddPhoto(): ReactElement {
	const picker = useRef<HTMLInputElement | null>(null);
	const anchor = useRef<HTMLSpanElement | null>(null);
	const add = useCommand(AddPhotosCommand);
	const paste = useCommand(PastePhotosCommand);
	usePastedFiles(IMAGES, (photos) => void paste.run({ photos }));
	useDroppedFiles(anchor, { scope: DROPPED_ON, typePrefix: IMAGES, onFiles: (photos) => void add.run({ photos }) });
	return (
		<span ref={anchor} className="cv:inline-flex cv:items-center cv:gap-1.5">
			<Tip label={ADD_PHOTO_SAID}>
				<IconButton
					size="s"
					variant="ghost"
					label={ADD_PHOTO}
					disabled={!add.can}
					isLoading={add.isRunning}
					onClick={() => picker.current?.click()}
				>
					<Icon name="image-plus" size={16} />
				</IconButton>
			</Tip>
			<input
				ref={picker}
				type="file"
				accept="image/*"
				multiple
				hidden
				onChange={(event: ChangeEvent<HTMLInputElement>) => {
					void add.run({ photos: filesOfType(event.currentTarget.files, IMAGES) });
					event.currentTarget.value = "";
				}}
			/>
		</span>
	);
}
