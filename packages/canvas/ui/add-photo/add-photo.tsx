import { createElement as h, useCallback, useRef } from "react";
import type { ChangeEvent, ReactElement } from "react";
import { Icon, IconButton } from "@widgetarium/kit";
import type { InjectProps } from "@widgetarium/core";
import type { addPhotoInject } from "../../widgets/add-photo.widget.js";
import { imageFilesIn } from "../image-files/image-files.js";
import { Tip } from "../tip/tip.js";
import { useDroppedPhotos } from "./hooks/use-dropped-photos.js";
import { usePastedPhotos } from "./hooks/use-pasted-photos.js";

const ADD_PHOTO = "Add photo";
const ADD_PHOTO_SAID = "Add a reference photo, or drop or paste one on the canvas";

export function AddPhoto({ getDrawing, addPhotos }: InjectProps<typeof addPhotoInject>): ReactElement {
	const picker = useRef<HTMLInputElement | null>(null);
	const anchor = useRef<HTMLSpanElement | null>(null);
	const onPhotos = useCallback((photos: readonly File[]) => void addPhotos({ photos: [...photos] }), [addPhotos]);
	usePastedPhotos(getDrawing?.ownsPaste ?? null, onPhotos);
	useDroppedPhotos(anchor, onPhotos);
	return (
		<span ref={anchor} className="cv:inline-flex cv:items-center cv:gap-1.5">
			<Tip label={ADD_PHOTO_SAID}>
				<IconButton size="s" variant="ghost" label={ADD_PHOTO} onClick={() => picker.current?.click()}>
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
					onPhotos(imageFilesIn(event.currentTarget.files));
					event.currentTarget.value = "";
				}}
			/>
		</span>
	);
}
