import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Dialog } from "@widgetarium/kit";
import type { AttachmentChip } from "../../../../shared/schema/attachment.schema.js";

export interface ImageViewerProps {
	readonly chip: AttachmentChip;
	readonly onClose: () => void;
}

const PICTURE = "cv:block cv:max-h-[70vh] cv:max-w-full cv:rounded-plate cv:object-contain cv:mx-auto";

export function ImageViewer({ chip, onClose }: ImageViewerProps): ReactElement {
	return (
		<Dialog isOpen title={chip.name} onClose={onClose}>
			{chip.preview ? <img className={PICTURE} src={chip.preview} alt={chip.name} data-attachment-viewer="" /> : null}
		</Dialog>
	);
}
