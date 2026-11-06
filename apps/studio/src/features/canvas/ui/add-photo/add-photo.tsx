import { createElement as h, useRef } from "react";
import type { ChangeEvent, ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { useCommand } from "@widgetarium/framework";
import { filesOfType, useDroppedFiles, usePastedFiles } from "@widgetarium/behaviors";
import { AddPhotosCommand } from "@widgetarium/canvas";
import { useCanvasSurroundings } from "../../lib/canvas-surroundings.js";
import { RoundButton } from "../round-button/round-button.js";
import { PAGE_NAME_AND_PHOTO_LEAVE } from "../../lib/app-zone-steps.js";

const ADD_PHOTO = "Add photo";
const ADD_PHOTO_SAID = "Add a reference photo, or drop or paste one on the canvas";
const IMAGES = "image/";
const DROPPED_ON = "[data-canvas-view]";
const PHOTO_HOLDER = `cv:inline-flex cv:items-center cv:gap-1.5 ${PAGE_NAME_AND_PHOTO_LEAVE}`;

export function AddPhoto(): ReactElement {
	const picker = useRef<HTMLInputElement | null>(null);
	const anchor = useRef<HTMLSpanElement | null>(null);
	const add = useCommand(AddPhotosCommand);
	const { ownsPaste } = useCanvasSurroundings();
	usePastedFiles(IMAGES, (photos) => {
		if (ownsPaste()) {
			void add.run({ photos });
		}
	});
	useDroppedFiles(anchor, { scope: DROPPED_ON, typePrefix: IMAGES, onFiles: (photos) => void add.run({ photos }) });
	return (
		<span ref={anchor} className={PHOTO_HOLDER}>
			<RoundButton
				label={ADD_PHOTO}
				tip={ADD_PHOTO_SAID}
				tone="plate"
				size="m"
				disabled={!add.can}
				isBusy={add.isRunning}
				onClick={() => picker.current?.click()}
			>
				<Icon name="image-plus" size={15} />
			</RoundButton>
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
