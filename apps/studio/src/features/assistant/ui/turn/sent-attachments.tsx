import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { AttachmentChipView } from "../attachment-chip/attachment-chip.js";
import { ImageViewer } from "./image-viewer.js";
import type { AttachmentChip } from "@widgetarium/assistant";

const ROW = "cv:flex cv:flex-wrap cv:justify-end cv:gap-1.5";

export function SentAttachments({ attached }: { readonly attached: readonly AttachmentChip[] }): ReactElement {
	const [opened, setOpened] = useState<AttachmentChip | null>(null);
	return (
		<div className={ROW} data-sent-attachments="">
			{attached.map((chip) => (
				<AttachmentChipView key={chip.id} chip={chip} onOpen={chip.preview ? () => setOpened(chip) : undefined} />
			))}
			{opened ? <ImageViewer chip={opened} onClose={() => setOpened(null)} /> : null}
		</div>
	);
}
