import { createElement as h, useRef } from "react";
import type { ChangeEvent, ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { useCommand } from "@widgetarium/core/requests";
import { filesOfType, useDroppedFiles, usePastedFiles } from "@widgetarium/behaviors";
import { AddPhotosCommand } from "../../contract.js";
import { PastePhotosCommand } from "../../contract.js";
import { RoundButton } from "../../../../shared/ui/round-button/round-button.js";
import { PAGE_NAME_AND_PHOTO_LEAVE } from "../../../../shared/lib/top-bar/app-zone-steps.js";

const ADD_PHOTO = "Add photo";
const ADD_PHOTO_SAID = "Add a reference photo, or drop or paste one on the canvas";
const IMAGES = "image/";
const DROPPED_ON = "[data-canvas-view]";
const PHOTO_HOLDER = `cv:inline-flex cv:items-center cv:gap-1.5 ${PAGE_NAME_AND_PHOTO_LEAVE}`;

export function AddPhoto(): ReactElement {
	const picker = useRef<HTMLInputElement | null>(null);
	const anchor = useRef<HTMLSpanElement | null>(null);
	const add = useCommand(AddPhotosCommand);
	const paste = useCommand(PastePhotosCommand);
	usePastedFiles(IMAGES, (photos) => void paste.run({ photos }));
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
