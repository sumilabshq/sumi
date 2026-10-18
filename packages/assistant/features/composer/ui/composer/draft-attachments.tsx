import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { AttachmentChipView } from "../../../../shared/ui/attachment-chip/attachment-chip.js";
import { DraftAttachmentsQuery, RemoveAttachmentCommand } from "../../contract.js";

const ROW = "cv:flex cv:flex-wrap cv:gap-1.5 cv:pb-1";

export function DraftAttachments(): ReactElement | null {
	const { data: drafts } = useQuery(DraftAttachmentsQuery);
	const remove = useCommand(RemoveAttachmentCommand);

	if (drafts.length === 0) {
		return null;
	}

	return (
		<div className={ROW} data-draft-attachments="">
			{drafts.map((chip) => (
				<AttachmentChipView key={chip.id} chip={chip} onRemove={() => void remove.run({ id: chip.id })} />
			))}
		</div>
	);
}
