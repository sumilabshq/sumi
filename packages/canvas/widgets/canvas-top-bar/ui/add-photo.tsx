import { createElement as h, useRef } from "react";
import type { ChangeEvent, ReactElement } from "react";
import { Icon, IconButton } from "@widgetarium/kit";
import { imageFilesIn } from "../../canvas-ui/image-files.js";
import { Tip } from "../../canvas-ui/tip.js";

const ADD_PHOTO = "Add photo";
const ADD_PHOTO_SAID = "Add a reference photo, or drop or paste one on the canvas";

export function AddPhoto({ onAddPhotos }: { readonly onAddPhotos: (photos: readonly File[]) => void }): ReactElement {
	const picker = useRef<HTMLInputElement | null>(null);
	return (
		<span>
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
					onAddPhotos(imageFilesIn(event.currentTarget.files));
					event.currentTarget.value = "";
				}}
			/>
		</span>
	);
}
