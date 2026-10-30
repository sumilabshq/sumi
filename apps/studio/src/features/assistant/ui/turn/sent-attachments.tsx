import { createElement as h } from "react";
import type { ReactElement } from "react";
import { AttachmentChipView } from "../attachment-chip/attachment-chip.js";
import type { AttachmentChip } from "@widgetarium/assistant";

const ROW = "cv:flex cv:flex-wrap cv:justify-end cv:gap-1.5";

export function SentAttachments({ attached }: { readonly attached: readonly AttachmentChip[] }): ReactElement {
	return (
		<div className={ROW} data-sent-attachments="">
			{attached.map((chip) => (
				<AttachmentChipView key={chip.id} chip={chip} />
			))}
		</div>
	);
}
